import Foundation

struct User: Codable, Equatable, Identifiable {
    var id: UUID = UUID()
    var appleUserId: String
    var email: String?
    var fullName: String?
    var createdAt: Date = .now
    var hasCompletedOnboarding: Bool = false
}
