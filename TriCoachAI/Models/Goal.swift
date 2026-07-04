import Foundation

struct Goal: Codable, Equatable, Identifiable {
    var id: UUID = UUID()
    var type: GoalType
    var targetDate: Date
    var priority: GoalPriority = .a
    /// Target time in seconds, when applicable (e.g. "sub-4h marathon").
    var targetTimeSeconds: Int?
    var status: GoalStatus = .active
    var createdAt: Date = .now

    var weeksUntilTarget: Int {
        max(1, Calendar.current.dateComponents([.weekOfYear], from: .now, to: targetDate).weekOfYear ?? type.recommendedWeeks)
    }
}
