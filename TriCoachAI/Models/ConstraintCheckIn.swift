import Foundation

struct ConstraintCheckIn: Codable, Equatable, Identifiable {
    var id: UUID = UUID()
    var date: Date = .now
    var injuries: [String] = []
    /// 1 (très frais) ... 5 (très fatigué)
    var fatigueLevel: Int = 2
    /// 1 (détendu) ... 5 (très stressé)
    var stressLevel: Int = 2
    var sleepHours: Double = 7.5

    var hasInjury: Bool { !injuries.isEmpty }
    var isHighFatigue: Bool { fatigueLevel >= 4 || stressLevel >= 4 }
    var isLowRecovery: Bool { sleepHours < 6 || fatigueLevel >= 4 }
}
