import Foundation

/// Splits a plan duration into macrocycle phases (Base/Build/Peak/Taper),
/// following standard endurance periodization proportions.
enum PeriodizationEngine {
    /// Taper length scales with race distance/duration — a 10K needs far
    /// less unloading than an Ironman.
    static func taperWeeks(for goalType: GoalType, totalWeeks: Int) -> Int {
        let base: Int
        switch goalType {
        case .run10k, .improveVMA, .weightLoss, .generalEndurance:
            base = 1
        case .duathlon, .triathlonSprint, .halfMarathon:
            base = 1
        case .triathlonOlympic, .marathon:
            base = 2
        case .halfIronman:
            base = 2
        case .ironman:
            base = 3
        }
        return max(1, min(base, totalWeeks / 4))
    }

    struct PhaseAllocation {
        let phase: MacrocyclePhase
        let weeks: Int
    }

    static func allocatePhases(totalWeeks: Int, goalType: GoalType) -> [PhaseAllocation] {
        guard totalWeeks > 0 else { return [] }

        if totalWeeks <= 3 {
            // Too short for a real base/build split: everything is race-specific sharpening.
            return [PhaseAllocation(phase: .peak, weeks: totalWeeks)]
        }

        let taper = taperWeeks(for: goalType, totalWeeks: totalWeeks)
        let remaining = totalWeeks - taper

        if remaining <= 3 {
            return [
                PhaseAllocation(phase: .build, weeks: remaining),
                PhaseAllocation(phase: .taper, weeks: taper),
            ].filter { $0.weeks > 0 }
        }

        let peak = max(1, Int((Double(remaining) * 0.20).rounded()))
        let build = max(1, Int((Double(remaining) * 0.35).rounded()))
        let base = max(1, remaining - peak - build)

        return [
            PhaseAllocation(phase: .base, weeks: base),
            PhaseAllocation(phase: .build, weeks: build),
            PhaseAllocation(phase: .peak, weeks: peak),
            PhaseAllocation(phase: .taper, weeks: taper),
        ].filter { $0.weeks > 0 }
    }

    static func buildMacrocycles(totalWeeks: Int, goalType: GoalType, startDate: Date) -> [Macrocycle] {
        let allocations = allocatePhases(totalWeeks: totalWeeks, goalType: goalType)
        let calendar = Calendar.current
        var cursor = calendar.startOfDay(for: startDate)
        var macrocycles: [Macrocycle] = []

        for allocation in allocations {
            let phaseStart = cursor
            let phaseEnd = calendar.date(byAdding: .day, value: allocation.weeks * 7 - 1, to: phaseStart) ?? phaseStart
            macrocycles.append(
                Macrocycle(
                    name: allocation.phase.label,
                    phase: allocation.phase,
                    startDate: phaseStart,
                    endDate: phaseEnd
                )
            )
            cursor = calendar.date(byAdding: .day, value: allocation.weeks * 7, to: cursor) ?? cursor
        }
        return macrocycles
    }
}
