import Foundation

/// Splits a macrocycle (phase) into 3-4 week mesocycle blocks, each with a
/// training focus. Blocks rotate the focus so a long Build phase progresses
/// aerobic threshold work into VO2max work rather than repeating itself.
enum MesocycleBuilder {
    private static func focuses(for phase: MacrocyclePhase) -> [String] {
        switch phase {
        case .base: return ["Endurance aérobie", "Endurance aérobie + technique"]
        case .build: return ["Seuil", "VO2max"]
        case .peak: return ["Spécifique course & enchaînements", "Allure course"]
        case .taper: return ["Affûtage"]
        case .transition: return ["Récupération active"]
        }
    }

    static func build(macrocycle: Macrocycle) -> [Mesocycle] {
        let calendar = Calendar.current
        let totalDays = calendar.dateComponents([.day], from: macrocycle.startDate, to: macrocycle.endDate).day.map { $0 + 1 } ?? 7
        let totalWeeks = max(1, Int((Double(totalDays) / 7.0).rounded(.up)))
        let blockSizeWeeks = 4
        let blockCount = max(1, Int((Double(totalWeeks) / Double(blockSizeWeeks)).rounded(.up)))
        let focusOptions = focuses(for: macrocycle.phase)

        var mesocycles: [Mesocycle] = []
        var cursor = macrocycle.startDate
        var weeksRemaining = totalWeeks

        for blockIndex in 0..<blockCount {
            let weeksInBlock = min(blockSizeWeeks, weeksRemaining)
            guard weeksInBlock > 0 else { break }
            let blockEnd = calendar.date(byAdding: .day, value: weeksInBlock * 7 - 1, to: cursor) ?? cursor
            let focus = focusOptions[blockIndex % focusOptions.count]

            mesocycles.append(
                Mesocycle(
                    name: "\(macrocycle.name) — bloc \(blockIndex + 1)",
                    focus: focus,
                    startDate: cursor,
                    endDate: min(blockEnd, macrocycle.endDate)
                )
            )
            cursor = calendar.date(byAdding: .day, value: weeksInBlock * 7, to: cursor) ?? cursor
            weeksRemaining -= weeksInBlock
        }
        return mesocycles
    }
}
