import XCTest
@testable import TriCoachAI

final class RuleBasedPlanStrategyTests: XCTestCase {
    private func makeContext(goalType: GoalType, durationWeeks: Int, sessionsPerWeek: Int = 5) -> PlanGenerationContext {
        var profile = AthleteProfile.empty
        profile.level = .intermediate
        profile.hrMax = 188
        profile.hrRest = 52
        profile.ftpWatts = 230
        profile.thresholdPaceSecPerKm = 270
        profile.cssPaceSecPer100m = 95

        var availability = Availability.default
        availability.sessionsPerWeek = sessionsPerWeek
        availability.availableDays = [.monday, .tuesday, .wednesday, .thursday, .friday, .saturday]
        availability.mandatoryRestDays = [.sunday]
        availability.maxSessionDurationMin = 75

        let goal = Goal(type: goalType, targetDate: .distantFuture, priority: .a)

        return PlanGenerationContext(
            profile: profile,
            goal: goal,
            availability: availability,
            explicitDurationWeeks: durationWeeks
        )
    }

    func testTriathlonOlympicPlanSpansRequestedWeeks() {
        let context = makeContext(goalType: .triathlonOlympic, durationWeeks: 12)
        let plan = RuleBasedPlanStrategy().generate(context: context)

        XCTAssertEqual(plan.durationWeeks, 12)
        XCTAssertEqual(plan.allMicrocycles.count, 12)
        XCTAssertTrue(plan.allWorkouts.contains { $0.sport == .swim })
        XCTAssertTrue(plan.allWorkouts.contains { $0.sport == .bike })
        XCTAssertTrue(plan.allWorkouts.contains { $0.sport == .run })
        XCTAssertTrue(plan.allWorkouts.contains { $0.sport == .brick }, "Triathlon plans should include brick sessions")
    }

    func testMarathonPlanOnlyContainsRunning() {
        let context = makeContext(goalType: .marathon, durationWeeks: 16)
        let plan = RuleBasedPlanStrategy().generate(context: context)
        XCTAssertTrue(plan.allWorkouts.allSatisfy { $0.sport == .run })
    }

    func testIronmanPlanHasLongerTaperThanOlympic() {
        let ironmanPlan = RuleBasedPlanStrategy().generate(context: makeContext(goalType: .ironman, durationWeeks: 24))
        let olympicPlan = RuleBasedPlanStrategy().generate(context: makeContext(goalType: .triathlonOlympic, durationWeeks: 12))

        let ironmanTaperWeeks = ironmanPlan.macrocycles.first { $0.phase == .taper }
            .map { Calendar.current.dateComponents([.day], from: $0.startDate, to: $0.endDate).day! / 7 + 1 } ?? 0
        let olympicTaperWeeks = olympicPlan.macrocycles.first { $0.phase == .taper }
            .map { Calendar.current.dateComponents([.day], from: $0.startDate, to: $0.endDate).day! / 7 + 1 } ?? 0

        XCTAssertGreaterThan(ironmanTaperWeeks, olympicTaperWeeks)
    }

    func testNoWorkoutsFallOnMandatoryRestDays() {
        let context = makeContext(goalType: .halfMarathon, durationWeeks: 8)
        let plan = RuleBasedPlanStrategy().generate(context: context)
        let calendar = Calendar.current

        for workout in plan.allWorkouts {
            let weekday = calendar.component(.weekday, from: workout.date)
            XCTAssertNotEqual(Weekday(rawValue: weekday), .sunday, "Sunday is a mandatory rest day")
        }
    }

    func testRecoveryWeeksHaveLowerLoadThanSurroundingWeeks() {
        let context = makeContext(goalType: .triathlonOlympic, durationWeeks: 12)
        let plan = RuleBasedPlanStrategy().generate(context: context)
        let recoveryWeeks = plan.allMicrocycles.filter(\.isRecoveryWeek)
        let loadWeeks = plan.allMicrocycles.filter { !$0.isRecoveryWeek }

        XCTAssertFalse(recoveryWeeks.isEmpty, "A 12-week plan should include at least one recovery week")
        let avgRecoveryLoad = recoveryWeeks.map(\.plannedLoad).reduce(0, +) / Double(recoveryWeeks.count)
        let avgLoadWeek = loadWeeks.map(\.plannedLoad).reduce(0, +) / Double(loadWeeks.count)
        XCTAssertLessThan(avgRecoveryLoad, avgLoadWeek)
    }

    func testSessionsPerWeekIsRespectedWithinAvailability() {
        let context = makeContext(goalType: .triathlonOlympic, durationWeeks: 8, sessionsPerWeek: 4)
        let plan = RuleBasedPlanStrategy().generate(context: context)
        for microcycle in plan.allMicrocycles {
            XCTAssertLessThanOrEqual(microcycle.workouts.count, 4)
        }
    }
}
