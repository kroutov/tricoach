import Foundation

/// Builds the actual `Workout` instances for a microcycle: decides which
/// sport/intensity goes on which available day, then fills in a structured
/// warmup/main-set/cooldown personalized with the athlete's zones.
enum WorkoutFactory {
    struct SessionSlot {
        let day: Weekday
        let sport: SportType
        let intensity: WorkoutIntensity
        let isKeySession: Bool
    }

    // MARK: - Weekly distribution

    static func sessionSlots(
        sessionsPerWeek: Int,
        availableDays: [Weekday],
        goalType: GoalType,
        phase: MacrocyclePhase,
        isRecoveryWeek: Bool,
        weekIndexInPlan: Int
    ) -> [SessionSlot] {
        guard sessionsPerWeek > 0, !availableDays.isEmpty else { return [] }

        let days = Array(availableDays.sorted { $0.rawWeekOrder < $1.rawWeekOrder }.prefix(sessionsPerWeek))
        let count = days.count
        let intensities = intensityPattern(count: count, phase: phase, isRecoveryWeek: isRecoveryWeek)
        let sports = goalType.sports.filter { $0 != .brick }
        let includeBrick = goalType.sports.contains(.brick)
            && !isRecoveryWeek
            && (phase == .build || phase == .peak)
            && count >= 4
            && weekIndexInPlan % 2 == 0

        var slots: [SessionSlot] = []
        var sportCursor = weekIndexInPlan % max(sports.count, 1)

        for index in 0..<count {
            let intensity = intensities[index]
            let isKey = intensity == .hard || (intensity == .moderate && index == count - 1)

            let sport: SportType
            if includeBrick, index == count - 1 {
                sport = .brick
            } else if sports.isEmpty {
                sport = .run
            } else {
                sport = sports[sportCursor % sports.count]
                sportCursor += 1
            }

            slots.append(SessionSlot(day: days[index], sport: sport, intensity: intensity, isKeySession: isKey))
        }
        return slots
    }

    /// ~80/20 easy-to-hard distribution, one key session per week outside
    /// recovery weeks (prevents overtraining while still driving adaptation).
    private static func intensityPattern(count: Int, phase: MacrocyclePhase, isRecoveryWeek: Bool) -> [WorkoutIntensity] {
        guard count > 0 else { return [] }
        if isRecoveryWeek || phase == .taper {
            var pattern = Array(repeating: WorkoutIntensity.easy, count: count)
            if count >= 2 { pattern[count / 2] = .moderate }
            return pattern
        }

        var pattern = Array(repeating: WorkoutIntensity.easy, count: count)
        switch phase {
        case .base:
            if count >= 3 { pattern[count - 1] = .moderate }
        case .build:
            if count >= 2 { pattern[1] = .hard }
            if count >= 4 { pattern[count - 1] = .moderate }
        case .peak:
            if count >= 2 { pattern[1] = .hard }
            if count >= 3 { pattern[count - 1] = .moderate }
        case .taper, .transition:
            break
        }
        return pattern
    }

    // MARK: - Workout construction

    static func makeWorkout(
        slot: SessionSlot,
        date: Date,
        profile: AthleteProfile,
        maxDurationMin: Int,
        loadMultiplier: Double
    ) -> Workout {
        let baseDuration = duration(for: slot, maxDurationMin: maxDurationMin)
        let durationMin = max(15, Int((Double(baseDuration) * loadMultiplier).rounded()))
        let structure = buildStructure(sport: slot.sport, intensity: slot.intensity, durationMin: durationMin, profile: profile)

        return Workout(
            date: date,
            sport: slot.sport,
            title: title(for: slot),
            summary: summary(for: slot, durationMin: durationMin),
            structure: structure,
            plannedDurationMin: durationMin,
            estimatedTSS: LoadCalculator.estimatedTSS(durationMin: durationMin, intensity: slot.intensity),
            estimatedTRIMP: LoadCalculator.estimatedTRIMP(durationMin: durationMin, intensity: slot.intensity, sex: profile.sex),
            rpeTarget: LoadCalculator.rpeTarget(for: slot.intensity),
            intensity: slot.intensity
        )
    }

    private static func duration(for slot: SessionSlot, maxDurationMin: Int) -> Int {
        switch (slot.isKeySession, slot.intensity) {
        case (true, .hard): return maxDurationMin
        case (true, .moderate): return Int(Double(maxDurationMin) * 0.9)
        case (_, .easy): return Int(Double(maxDurationMin) * 0.6)
        case (_, .moderate): return Int(Double(maxDurationMin) * 0.75)
        case (_, .hard): return Int(Double(maxDurationMin) * 0.85)
        }
    }

    private static func title(for slot: SessionSlot) -> String {
        switch (slot.sport, slot.intensity) {
        case (.brick, _): return "Enchaînement vélo + course"
        case (_, .easy): return "\(slot.sport.label) — Endurance fondamentale"
        case (_, .moderate): return "\(slot.sport.label) — Tempo / allure course"
        case (_, .hard): return "\(slot.sport.label) — Fractionné VO2max / seuil"
        }
    }

    private static func summary(for slot: SessionSlot, durationMin: Int) -> String {
        "\(slot.sport.label), \(durationMin) min, intensité \(slot.intensity.label.lowercased())."
    }

    // MARK: - Structure (échauffement / corps principal / retour au calme)

    private static func buildStructure(sport: SportType, intensity: WorkoutIntensity, durationMin: Int, profile: AthleteProfile) -> WorkoutStructure {
        let warmupMin = sport == .swim ? 10 : 12
        let cooldownMin = 8
        let mainSetMin = max(10, durationMin - warmupMin - cooldownMin)

        let warmup = WorkoutSection(
            durationMin: warmupMin,
            description: "Échauffement progressif, montée en allure jusqu'à \(sport == .swim ? "aisance technique" : "Z2").",
            target: targetZone(sport: sport, intensity: .easy, profile: profile)
        )
        let cooldown = WorkoutSection(
            durationMin: cooldownMin,
            description: "Retour au calme, allure très facile, étirements légers.",
            target: targetZone(sport: sport, intensity: .easy, profile: profile)
        )
        let mainSet = mainSetBlocks(sport: sport, intensity: intensity, mainSetMin: mainSetMin, profile: profile)

        return WorkoutStructure(warmup: warmup, mainSet: mainSet, cooldown: cooldown)
    }

    private static func mainSetBlocks(sport: SportType, intensity: WorkoutIntensity, mainSetMin: Int, profile: AthleteProfile) -> [IntervalBlock] {
        let target = targetZone(sport: sport, intensity: intensity, profile: profile)

        switch intensity {
        case .easy:
            return [IntervalBlock(repetitions: 1, workDurationSec: mainSetMin * 60, recoveryDurationSec: 0, target: target, note: "Continu, allure conversationnelle.")]
        case .moderate:
            return [IntervalBlock(repetitions: 1, workDurationSec: mainSetMin * 60, recoveryDurationSec: 0, target: target, note: "Tempo soutenu et régulier.")]
        case .hard:
            // Interval count/duration scaled per sport for realism (swim = short reps, bike/run = longer reps).
            switch sport {
            case .swim:
                let reps = max(4, mainSetMin / 3)
                return [IntervalBlock(repetitions: reps, workDurationSec: 100, recoveryDurationSec: 20, target: target, note: "100m soutenu, départ toutes les ~2 min.")]
            case .bike:
                let reps = max(3, mainSetMin / 8)
                return [IntervalBlock(repetitions: reps, workDurationSec: 4 * 60, recoveryDurationSec: 3 * 60, target: target, note: "Bloc à haute puissance, récupération active.")]
            default:
                let reps = max(4, mainSetMin / 6)
                return [IntervalBlock(repetitions: reps, workDurationSec: 3 * 60, recoveryDurationSec: 2 * 60, target: target, note: "Fractionné VO2max, récupération trottinée.")]
            }
        }
    }

    private static func targetZone(sport: SportType, intensity: WorkoutIntensity, profile: AthleteProfile) -> TargetZone {
        let zoneNumber: Int
        switch intensity {
        case .easy: zoneNumber = 2
        case .moderate: zoneNumber = 3
        case .hard: zoneNumber = sport == .swim ? 4 : 5
        }

        var zone = TargetZone(hrZone: zoneNumber)
        if let hrRange = profile.heartRateZone(zoneNumber) {
            zone.hrRangeBpm = ClosedRangeCodable(hrRange)
        }

        switch sport {
        case .run, .brick:
            if let threshold = profile.thresholdPaceSecPerKm {
                let factor: Double = intensity == .easy ? 1.20 : (intensity == .moderate ? 1.05 : 0.92)
                let paceCenter = Int(Double(threshold) * factor)
                zone.paceSecPerKm = ClosedRangeCodable(lowerBound: paceCenter - 8, upperBound: paceCenter + 8)
            }
        case .bike:
            if let ftp = profile.ftpWatts {
                let factor: Double = intensity == .easy ? 0.60 : (intensity == .moderate ? 0.80 : 1.05)
                let center = Int(Double(ftp) * factor)
                zone.powerWatts = ClosedRangeCodable(lowerBound: max(0, center - 15), upperBound: center + 15)
            }
        case .swim:
            if let css = profile.cssPaceSecPer100m {
                let factor: Double = intensity == .easy ? 1.20 : (intensity == .moderate ? 1.08 : 0.98)
                let center = Int(Double(css) * factor)
                zone.paceSecPer100m = ClosedRangeCodable(lowerBound: center - 3, upperBound: center + 3)
            }
        case .strength, .rest:
            break
        }
        return zone
    }
}

private extension Weekday {
    /// Monday-first ordering for stable, human-friendly sorting of session days.
    var rawWeekOrder: Int {
        Weekday.orderedWeek.firstIndex(of: self) ?? 0
    }
}
