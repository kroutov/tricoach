import Foundation

struct PlanGenerationContext {
    var profile: AthleteProfile
    var goal: Goal
    var availability: Availability
    var recentCheckIns: [ConstraintCheckIn] = []
    var startDate: Date = .now
    /// 4/8/12/16 weeks, or nil to derive from the goal's target date ("durée libre jusqu'à une course cible").
    var explicitDurationWeeks: Int?
}

/// Abstraction over "how a plan is generated", so a future LLM-backed
/// strategy (server-side call to Claude) can be swapped in without touching
/// callers — both must produce the same `TrainingPlan` contract.
protocol PlanGenerationStrategy {
    func generate(context: PlanGenerationContext) -> TrainingPlan
}
