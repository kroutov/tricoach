import Foundation

struct AdaptationEvent: Codable, Equatable, Identifiable {
    var id: UUID = UUID()
    var planId: UUID
    var triggeredBy: AdaptationTrigger
    var actionTaken: String
    var deltaLoadPercent: Double?
    var createdAt: Date = .now
}
