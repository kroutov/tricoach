import XCTest
@testable import TriCoachAI

final class WorkoutFactoryTests: XCTestCase {
    let mondayToSaturday: [Weekday] = [.monday, .tuesday, .wednesday, .thursday, .friday, .saturday]

    func testSessionCountMatchesRequest() {
        let slots = WorkoutFactory.sessionSlots(
            sessionsPerWeek: 5,
            availableDays: mondayToSaturday,
            goalType: .triathlonOlympic,
            phase: .build,
            isRecoveryWeek: false,
            weekIndexInPlan: 3
        )
        XCTAssertEqual(slots.count, 5)
    }

    func testRecoveryWeekHasNoHardSessions() {
        let slots = WorkoutFactory.sessionSlots(
            sessionsPerWeek: 5,
            availableDays: mondayToSaturday,
            goalType: .marathon,
            phase: .build,
            isRecoveryWeek: true,
            weekIndexInPlan: 4
        )
        XCTAssertFalse(slots.contains { $0.intensity == .hard })
    }

    func testTriathlonBuildPhaseIncludesBrickWithEnoughSessions() {
        let slots = WorkoutFactory.sessionSlots(
            sessionsPerWeek: 5,
            availableDays: mondayToSaturday,
            goalType: .triathlonOlympic,
            phase: .build,
            isRecoveryWeek: false,
            weekIndexInPlan: 2 // even index -> brick eligible
        )
        XCTAssertTrue(slots.contains { $0.sport == .brick })
    }

    func testMarathonPlanNeverIncludesSwimOrBike() {
        let slots = WorkoutFactory.sessionSlots(
            sessionsPerWeek: 6,
            availableDays: mondayToSaturday,
            goalType: .marathon,
            phase: .build,
            isRecoveryWeek: false,
            weekIndexInPlan: 5
        )
        XCTAssertTrue(slots.allSatisfy { $0.sport == .run })
    }

    func testHardWorkoutUsesPersonalizedPaceZone() {
        var profile = AthleteProfile.empty
        profile.thresholdPaceSecPerKm = 240 // 4:00/km
        profile.hrMax = 190
        profile.hrRest = 50

        let slot = WorkoutFactory.SessionSlot(day: .tuesday, sport: .run, intensity: .hard, isKeySession: true)
        let workout = WorkoutFactory.makeWorkout(slot: slot, date: .now, profile: profile, maxDurationMin: 60, loadMultiplier: 1.0)

        let mainSetTarget = workout.structure.mainSet.first?.target
        XCTAssertNotNil(mainSetTarget?.paceSecPerKm)
        XCTAssertNotNil(mainSetTarget?.hrRangeBpm)
        // Hard running pace should be faster (lower sec/km) than threshold pace.
        if let pace = mainSetTarget?.paceSecPerKm {
            XCTAssertLessThan(pace.upperBound, 240)
        }
    }

    func testEasyWorkoutIsSingleContinuousBlock() {
        let slot = WorkoutFactory.SessionSlot(day: .monday, sport: .bike, intensity: .easy, isKeySession: false)
        let workout = WorkoutFactory.makeWorkout(slot: slot, date: .now, profile: .empty, maxDurationMin: 90, loadMultiplier: 1.0)
        XCTAssertEqual(workout.structure.mainSet.count, 1)
        XCTAssertEqual(workout.structure.mainSet.first?.repetitions, 1)
    }

    func testLoadMultiplierScalesDuration() {
        let slot = WorkoutFactory.SessionSlot(day: .monday, sport: .run, intensity: .easy, isKeySession: false)
        let full = WorkoutFactory.makeWorkout(slot: slot, date: .now, profile: .empty, maxDurationMin: 60, loadMultiplier: 1.0)
        let reduced = WorkoutFactory.makeWorkout(slot: slot, date: .now, profile: .empty, maxDurationMin: 60, loadMultiplier: 0.65)
        XCTAssertLessThan(reduced.plannedDurationMin, full.plannedDurationMin)
    }
}
