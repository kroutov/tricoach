import Foundation

/// Compares planned vs. completed sessions and recent wellness signals to
/// decide whether — and how — next week's plan should change.
///
/// Rules (see plan §6):
/// - ≥2 failed/missed hard sessions in the trailing window → cut next week's load ~15-20%.
/// - Low recovery signals (poor sleep/high fatigue check-in) → insert recovery, ease intensity.
/// - Objective HRV drop / resting HR rise vs. the rolling baseline ("dérive cardiaque") → reduce intensity.
/// - Strong, consistent completion → progressive overload +5-10%.
/// - High declared fatigue/stress → reduce intensity.
/// - Any logged injury → alert and freeze progression (checked first, short-circuits other rules).
enum AdaptationEngine {
    // How far the latest HealthMetricsDaily reading must move from the
    // rolling baseline (the trailing days in the same window, excluding the
    // latest reading itself) before it counts as strain rather than noise.
    private static let hrvDropThresholdPct = 0.15
    private static let restingHrRiseThresholdPct = 0.1

    private struct PhysiologicalStrain {
        let hrvDrop: Bool
        let restingHrRise: Bool
    }

    private static func detectPhysiologicalStrain(_ recentHealthMetrics: [HealthMetricsDaily]) -> PhysiologicalStrain {
        let sorted = recentHealthMetrics.sorted { $0.date < $1.date }
        guard let latest = sorted.last else { return PhysiologicalStrain(hrvDrop: false, restingHrRise: false) }
        let baseline = sorted.dropLast()

        let hrvBaselineValues = baseline.compactMap(\.hrvMs)
        let hrvBaseline = hrvBaselineValues.isEmpty ? nil : hrvBaselineValues.reduce(0, +) / Double(hrvBaselineValues.count)

        let restingHrBaselineValues = baseline.compactMap { $0.restingHr }.map(Double.init)
        let restingHrBaseline = restingHrBaselineValues.isEmpty ? nil : restingHrBaselineValues.reduce(0, +) / Double(restingHrBaselineValues.count)

        let hrvDrop: Bool = {
            guard let hrv = latest.hrvMs, let baseline = hrvBaseline else { return false }
            return hrv < baseline * (1 - hrvDropThresholdPct)
        }()
        let restingHrRise: Bool = {
            guard let restingHr = latest.restingHr, let baseline = restingHrBaseline else { return false }
            return Double(restingHr) > baseline * (1 + restingHrRiseThresholdPct)
        }()

        return PhysiologicalStrain(hrvDrop: hrvDrop, restingHrRise: restingHrRise)
    }

    struct WorkoutOutcome {
        let planned: Workout
        let completed: CompletedActivity?

        /// Realized duration ÷ planned duration; nil when there's nothing to compare (workout still upcoming).
        var completionRatio: Double? {
            guard let completed, planned.plannedDurationMin > 0 else { return nil }
            return Double(completed.durationS) / 60.0 / Double(planned.plannedDurationMin)
        }

        var isMissed: Bool { completed == nil && planned.date < .now }
        var isUnderperformed: Bool {
            guard let ratio = completionRatio else { return false }
            return ratio < 0.8
        }
    }

    static func evaluate(
        planId: UUID,
        recentOutcomes: [WorkoutOutcome],
        recentCheckIns: [ConstraintCheckIn],
        recentHealthMetrics: [HealthMetricsDaily] = []
    ) -> [AdaptationEvent] {
        // Safety first: an injury flag freezes everything else.
        if let injured = recentCheckIns.first(where: { $0.hasInjury }) {
            return [
                AdaptationEvent(
                    planId: planId,
                    triggeredBy: .injuryFlag,
                    actionTaken: "Progression gelée : douleur/blessure signalée (\(injured.injuries.joined(separator: ", "))). Consultez un professionnel de santé avant de reprendre les séances difficiles.",
                    deltaLoadPercent: 0
                ),
            ]
        }

        var events: [AdaptationEvent] = []

        let failedHardSessions = recentOutcomes.filter { $0.planned.intensity == .hard && ($0.isMissed || $0.isUnderperformed) }
        if failedHardSessions.count >= 2 {
            events.append(
                AdaptationEvent(
                    planId: planId,
                    triggeredBy: failedHardSessions.contains(where: \.isMissed) ? .missedWorkout : .underperformance,
                    actionTaken: "\(failedHardSessions.count) séances difficiles ratées ou incomplètes récemment : réduction de la charge de la semaine suivante de 18%.",
                    deltaLoadPercent: -18
                )
            )
        }

        if let latestCheckIn = recentCheckIns.sorted(by: { $0.date > $1.date }).first {
            if latestCheckIn.isLowRecovery {
                events.append(
                    AdaptationEvent(
                        planId: planId,
                        triggeredBy: .lowRecovery,
                        actionTaken: "Sommeil/fatigue indiquent une récupération faible : ajout d'une séance de récupération et conversion de la prochaine séance difficile en séance facile.",
                        deltaLoadPercent: -10
                    )
                )
            } else if latestCheckIn.isHighFatigue {
                events.append(
                    AdaptationEvent(
                        planId: planId,
                        triggeredBy: .highFatigue,
                        actionTaken: "Fatigue/stress déclarés élevés : réduction de l'intensité de la semaine suivante.",
                        deltaLoadPercent: -10
                    )
                )
            }
        }

        let strain = detectPhysiologicalStrain(recentHealthMetrics)
        if strain.hrvDrop || strain.restingHrRise {
            var signals: [String] = []
            if strain.hrvDrop { signals.append("VFC en baisse") }
            if strain.restingHrRise { signals.append("fréquence cardiaque au repos élevée") }
            events.append(
                AdaptationEvent(
                    planId: planId,
                    triggeredBy: .physiologicalStrain,
                    actionTaken: "Dérive cardiaque détectée (\(signals.joined(separator: " et "))) par rapport à la moyenne des 7 derniers jours : réduction de l'intensité de la semaine suivante.",
                    deltaLoadPercent: -10
                )
            )
        }

        // Only reward progression when there's no fatigue/failure signal this cycle.
        if events.isEmpty, !recentOutcomes.isEmpty {
            let completed = recentOutcomes.compactMap(\.completionRatio)
            let completionRate = Double(completed.filter { $0 >= 0.95 }.count) / Double(recentOutcomes.count)
            if completionRate >= 0.9 {
                events.append(
                    AdaptationEvent(
                        planId: planId,
                        triggeredBy: .overperformance,
                        actionTaken: "Séances complétées avec succès (\(Int(completionRate * 100))%) : augmentation progressive de la charge de +7%.",
                        deltaLoadPercent: 7
                    )
                )
            }
        }

        return events
    }

    /// Applies an evaluation's net effect to the next not-yet-completed
    /// microcycle's planned load — the mutation the adaptation events describe.
    static func applyDeltaLoad(_ events: [AdaptationEvent], to microcycle: Microcycle) -> Microcycle {
        guard !events.isEmpty else { return microcycle }
        let totalDeltaPercent = events.compactMap(\.deltaLoadPercent).reduce(0, +)
        let multiplier = max(0.4, 1.0 + totalDeltaPercent / 100.0)

        var updated = microcycle
        updated.plannedLoad *= multiplier
        updated.workouts = microcycle.workouts.map { workout in
            var w = workout
            if let tss = w.estimatedTSS { w.estimatedTSS = tss * multiplier }
            if let trimp = w.estimatedTRIMP { w.estimatedTRIMP = trimp * multiplier }
            w.plannedDurationMin = max(10, Int((Double(w.plannedDurationMin) * multiplier).rounded()))
            return w
        }
        return updated
    }
}
