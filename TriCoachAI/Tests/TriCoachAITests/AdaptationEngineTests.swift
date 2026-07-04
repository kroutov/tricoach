import XCTest
@testable import TriCoachAI

final class AdaptationEngineTests: XCTestCase {
    private func hardWorkout(daysAgo: Int) -> Workout {
        Workout(
            date: Calendar.current.date(byAdding: .day, value: -daysAgo, to: .now)!,
            sport: .run,
            title: "Fractionné VO2max",
            summary: "",
            structure: WorkoutStructure(
                warmup: WorkoutSection(durationMin: 10, description: "", target: TargetZone()),
                mainSet: [],
                cooldown: WorkoutSection(durationMin: 10, description: "", target: TargetZone())
            ),
            plannedDurationMin: 60,
            intensity: .hard
        )
    }

    func testInjuryFlagShortCircuitsOtherRules() {
        let planId = UUID()
        let checkIn = ConstraintCheckIn(injuries: ["douleur genou droit"], fatigueLevel: 2, stressLevel: 2, sleepHours: 8)
        let events = AdaptationEngine.evaluate(planId: planId, recentOutcomes: [], recentCheckIns: [checkIn])

        XCTAssertEqual(events.count, 1)
        XCTAssertEqual(events.first?.triggeredBy, .injuryFlag)
    }

    func testTwoFailedHardSessionsReducesNextWeekLoad() {
        let planId = UUID()
        let outcomes = [
            AdaptationEngine.WorkoutOutcome(planned: hardWorkout(daysAgo: 2), completed: nil),
            AdaptationEngine.WorkoutOutcome(planned: hardWorkout(daysAgo: 5), completed: nil),
        ]
        let events = AdaptationEngine.evaluate(planId: planId, recentOutcomes: outcomes, recentCheckIns: [])

        XCTAssertTrue(events.contains { $0.triggeredBy == .missedWorkout })
        XCTAssertTrue(events.contains { ($0.deltaLoadPercent ?? 0) < 0 })
    }

    func testLowRecoveryChecklnTriggersLoadReduction() {
        let planId = UUID()
        let checkIn = ConstraintCheckIn(fatigueLevel: 4, stressLevel: 2, sleepHours: 5)
        let events = AdaptationEngine.evaluate(planId: planId, recentOutcomes: [], recentCheckIns: [checkIn])

        XCTAssertTrue(events.contains { $0.triggeredBy == .lowRecovery })
    }

    func testHighCompletionRateWithNoFatigueSignalIncreasesLoad() {
        let planId = UUID()
        let workout = hardWorkout(daysAgo: 3)
        let completedActivity = CompletedActivity(
            source: .healthKit,
            startTime: workout.date,
            durationS: workout.plannedDurationMin * 60,
            sport: .run
        )
        let outcomes = [AdaptationEngine.WorkoutOutcome(planned: workout, completed: completedActivity)]
        let events = AdaptationEngine.evaluate(planId: planId, recentOutcomes: outcomes, recentCheckIns: [])

        XCTAssertTrue(events.contains { $0.triggeredBy == .overperformance })
        XCTAssertTrue(events.contains { ($0.deltaLoadPercent ?? 0) > 0 })
    }

    private func healthMetrics(baselineValue: Double, latestValue: Double, field: WritableKeyPath<HealthMetricsDaily, Double?>) -> [HealthMetricsDaily] {
        var baseline: [HealthMetricsDaily] = (1...6).map { daysAgo in
            var metric = HealthMetricsDaily(date: Calendar.current.date(byAdding: .day, value: -daysAgo, to: .now)!)
            metric[keyPath: field] = baselineValue
            return metric
        }
        var latest = HealthMetricsDaily(date: .now)
        latest[keyPath: field] = latestValue
        baseline.append(latest)
        return baseline
    }

    func testHrvDropBelowBaselineTriggersPhysiologicalStrain() {
        let planId = UUID()
        let metrics = healthMetrics(baselineValue: 60, latestValue: 40, field: \.hrvMs) // -33%
        let events = AdaptationEngine.evaluate(planId: planId, recentOutcomes: [], recentCheckIns: [], recentHealthMetrics: metrics)

        XCTAssertTrue(events.contains { $0.triggeredBy == .physiologicalStrain })
        XCTAssertTrue(events.contains { ($0.deltaLoadPercent ?? 0) < 0 })
    }

    func testRestingHrRiseAboveBaselineTriggersPhysiologicalStrain() {
        let planId = UUID()
        var baseline: [HealthMetricsDaily] = (1...6).map { daysAgo in
            var metric = HealthMetricsDaily(date: Calendar.current.date(byAdding: .day, value: -daysAgo, to: .now)!)
            metric.restingHr = 50
            return metric
        }
        var latest = HealthMetricsDaily(date: .now)
        latest.restingHr = 60 // +20%
        baseline.append(latest)

        let events = AdaptationEngine.evaluate(planId: planId, recentOutcomes: [], recentCheckIns: [], recentHealthMetrics: baseline)

        XCTAssertTrue(events.contains { $0.triggeredBy == .physiologicalStrain })
    }

    func testMinorHrvDipWithinNoiseDoesNotTriggerPhysiologicalStrain() {
        let planId = UUID()
        let metrics = healthMetrics(baselineValue: 60, latestValue: 57, field: \.hrvMs) // -5%
        let events = AdaptationEngine.evaluate(planId: planId, recentOutcomes: [], recentCheckIns: [], recentHealthMetrics: metrics)

        XCTAssertFalse(events.contains { $0.triggeredBy == .physiologicalStrain })
    }

    func testApplyDeltaLoadReducesMicrocyclePlannedLoad() {
        let events = [AdaptationEvent(planId: UUID(), triggeredBy: .missedWorkout, actionTaken: "test", deltaLoadPercent: -20)]
        let microcycle = Microcycle(weekNumber: 3, startDate: .now, endDate: .now, plannedLoad: 300, workouts: [hardWorkout(daysAgo: 0)])

        let updated = AdaptationEngine.applyDeltaLoad(events, to: microcycle)

        XCTAssertEqual(updated.plannedLoad, 240, accuracy: 0.01)
        XCTAssertLessThan(updated.workouts.first!.plannedDurationMin, microcycle.workouts.first!.plannedDurationMin)
    }
}
