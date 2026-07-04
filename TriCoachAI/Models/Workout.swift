import Foundation

/// A target intensity, expressed however is most natural for the sport
/// (HR zone always available; pace/power/cadence when relevant).
struct TargetZone: Codable, Equatable, Hashable {
    var hrZone: Int?
    var hrRangeBpm: ClosedRangeCodable<Int>?
    var paceSecPerKm: ClosedRangeCodable<Int>?
    var paceSecPer100m: ClosedRangeCodable<Int>?
    var powerWatts: ClosedRangeCodable<Int>?
    var cadence: Int?
}

/// A single block within the main set (e.g. "5 x 3 min @ Z4, récup 2 min Z1").
struct IntervalBlock: Codable, Equatable, Hashable, Identifiable {
    var id: UUID = UUID()
    var repetitions: Int = 1
    var workDurationSec: Int
    var recoveryDurationSec: Int = 0
    var target: TargetZone
    var note: String?
}

struct WorkoutSection: Codable, Equatable, Hashable {
    var durationMin: Int
    var description: String
    var target: TargetZone
}

struct WorkoutStructure: Codable, Equatable, Hashable {
    var warmup: WorkoutSection
    var mainSet: [IntervalBlock]
    var cooldown: WorkoutSection
}

struct Workout: Codable, Equatable, Hashable, Identifiable {
    var id: UUID = UUID()
    var date: Date
    var sport: SportType
    var title: String
    var summary: String
    var structure: WorkoutStructure
    var plannedDurationMin: Int
    var plannedDistanceM: Int?
    var estimatedTSS: Double?
    var estimatedTRIMP: Double?
    var rpeTarget: Int?
    var intensity: WorkoutIntensity
    var status: WorkoutStatus = .planned
    var calendarEventId: String?
    var isRecoveryWeek: Bool = false
}

/// `ClosedRange` isn't directly `Codable`; this thin wrapper is.
struct ClosedRangeCodable<Bound: Codable & Comparable & Hashable>: Codable, Equatable, Hashable {
    var lowerBound: Bound
    var upperBound: Bound

    init(_ range: ClosedRange<Bound>) {
        lowerBound = range.lowerBound
        upperBound = range.upperBound
    }

    init(lowerBound: Bound, upperBound: Bound) {
        self.lowerBound = lowerBound
        self.upperBound = upperBound
    }

    var range: ClosedRange<Bound> { lowerBound...upperBound }
}
