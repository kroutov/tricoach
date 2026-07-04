import Foundation

/// Builds the week-by-week microcycles for a mesocycle: assigns a load
/// multiplier per week (progressive overload with a lighter 4th week) and
/// delegates session placement to `WorkoutFactory`.
enum MicrocycleBuilder {
    static func build(
        mesocycle: Mesocycle,
        phase: MacrocyclePhase,
        startingGlobalWeekIndex: Int,
        totalPlanWeeks: Int,
        context: PlanGenerationContext
    ) -> [Microcycle] {
        let calendar = Calendar.current
        let totalDays = (calendar.dateComponents([.day], from: mesocycle.startDate, to: mesocycle.endDate).day ?? 6) + 1
        let weekCount = max(1, Int((Double(totalDays) / 7.0).rounded()))

        let restDays = context.availability.mandatoryRestDays
        let availableDays = context.availability.availableDays.subtracting(restDays)
            .sorted { $0.rawWeekOrder < $1.rawWeekOrder }
        let sessionsPerWeek = min(context.availability.sessionsPerWeek, max(availableDays.count, 1))

        var microcycles: [Microcycle] = []
        var weekStart = mesocycle.startDate

        for offset in 0..<weekCount {
            let globalIndex = startingGlobalWeekIndex + offset
            let weekEnd = calendar.date(byAdding: .day, value: 6, to: weekStart) ?? weekStart
            let isRecoveryWeek = phase != .taper && phase != .transition && globalIndex % 4 == 0
            let multiplier = loadMultiplier(globalWeekIndex: globalIndex, isRecoveryWeek: isRecoveryWeek, phase: phase, totalPlanWeeks: totalPlanWeeks)

            let slots = WorkoutFactory.sessionSlots(
                sessionsPerWeek: sessionsPerWeek,
                availableDays: availableDays,
                goalType: context.goal.type,
                phase: phase,
                isRecoveryWeek: isRecoveryWeek,
                weekIndexInPlan: globalIndex
            )

            let datesByWeekday = weekdayDates(from: weekStart, calendar: calendar)
            let workouts = slots.map { slot in
                WorkoutFactory.makeWorkout(
                    slot: slot,
                    date: datesByWeekday[slot.day] ?? weekStart,
                    profile: context.profile,
                    maxDurationMin: context.availability.maxSessionDurationMin,
                    loadMultiplier: multiplier
                )
            }.sorted { $0.date < $1.date }

            microcycles.append(
                Microcycle(
                    weekNumber: globalIndex,
                    startDate: weekStart,
                    endDate: weekEnd,
                    isRecoveryWeek: isRecoveryWeek,
                    plannedLoad: LoadCalculator.totalLoad(workouts),
                    workouts: workouts
                )
            )
            weekStart = calendar.date(byAdding: .day, value: 7, to: weekStart) ?? weekStart
        }
        return microcycles
    }

    /// Progressive overload within a 4-week block (weeks 1-3 build, week 4
    /// unloads), tapering down as the plan approaches its final race week.
    private static func loadMultiplier(globalWeekIndex: Int, isRecoveryWeek: Bool, phase: MacrocyclePhase, totalPlanWeeks: Int) -> Double {
        if phase == .taper {
            let weeksToGo = totalPlanWeeks - globalWeekIndex
            return weeksToGo <= 0 ? 0.40 : 0.65
        }
        if isRecoveryWeek {
            return 0.65
        }
        let positionInBlock = (globalWeekIndex - 1) % 4 // 0, 1, 2 are load weeks
        return min(1.24, 1.0 + 0.08 * Double(positionInBlock))
    }

    private static func weekdayDates(from weekStart: Date, calendar: Calendar) -> [Weekday: Date] {
        var result: [Weekday: Date] = [:]
        for dayOffset in 0..<7 {
            guard let date = calendar.date(byAdding: .day, value: dayOffset, to: weekStart) else { continue }
            let weekdayComponent = calendar.component(.weekday, from: date)
            if let weekday = Weekday(rawValue: weekdayComponent) {
                result[weekday] = date
            }
        }
        return result
    }
}

private extension Weekday {
    var rawWeekOrder: Int {
        Weekday.orderedWeek.firstIndex(of: self) ?? 0
    }
}
