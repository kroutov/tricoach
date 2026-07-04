import Foundation

/// Default plan generation strategy: deterministic periodization rules
/// (no network, no LLM). See `PlanGenerationStrategy` for the extensibility
/// point a future `LLMPlanStrategy` would implement instead.
struct RuleBasedPlanStrategy: PlanGenerationStrategy {
    func generate(context: PlanGenerationContext) -> TrainingPlan {
        let totalWeeks = min(max(context.explicitDurationWeeks ?? context.goal.weeksUntilTarget, 4), 52)
        let calendar = Calendar.current
        let startDate = calendar.startOfDay(for: context.startDate)
        let endDate = calendar.date(byAdding: .day, value: totalWeeks * 7 - 1, to: startDate) ?? startDate

        var macrocycles = PeriodizationEngine.buildMacrocycles(
            totalWeeks: totalWeeks,
            goalType: context.goal.type,
            startDate: startDate
        )

        var globalWeekIndex = 1
        for macroIndex in macrocycles.indices {
            var mesocycles = MesocycleBuilder.build(macrocycle: macrocycles[macroIndex])
            for mesoIndex in mesocycles.indices {
                let microcycles = MicrocycleBuilder.build(
                    mesocycle: mesocycles[mesoIndex],
                    phase: macrocycles[macroIndex].phase,
                    startingGlobalWeekIndex: globalWeekIndex,
                    totalPlanWeeks: totalWeeks,
                    context: context
                )
                mesocycles[mesoIndex].microcycles = microcycles
                globalWeekIndex += microcycles.count
            }
            macrocycles[macroIndex].mesocycles = mesocycles
        }

        return TrainingPlan(
            goalId: context.goal.id,
            startDate: startDate,
            endDate: endDate,
            durationWeeks: totalWeeks,
            status: .active,
            macrocycles: macrocycles
        )
    }
}
