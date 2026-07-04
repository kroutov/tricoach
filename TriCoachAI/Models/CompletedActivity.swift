import Foundation

struct CompletedActivity: Codable, Equatable, Identifiable {
    var id: UUID = UUID()
    var workoutId: UUID?
    var source: ActivitySource
    var externalId: String?
    var startTime: Date
    var durationS: Int
    var distanceM: Double?
    var avgHr: Int?
    var maxHr: Int?
    var avgPowerWatts: Int?
    var avgPaceSecPerKm: Int?
    var elevationGainM: Double?
    var sport: SportType
    var createdAt: Date = .now
}
