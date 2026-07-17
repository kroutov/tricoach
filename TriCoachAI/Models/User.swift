import Foundation

struct User: Codable, Equatable, Identifiable {
    var id: UUID = UUID()
    /// Nil for accounts created with email/password — Apple ID linkage is
    /// optional now that password auth exists alongside Sign In with Apple.
    var appleUserId: String?
    var email: String?
    var fullName: String?
    var createdAt: Date = .now
    var hasCompletedOnboarding: Bool = false
    /// City the user set on their profile, used server-side for the weekly
    /// menu proposal's weather signal — nil means no location set yet.
    var location: String?
}
