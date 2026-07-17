import Foundation

private struct UpdateUserRequest: Encodable {
    let fullName: String?
    let hasCompletedOnboarding: Bool?
}

/// `/me` user-record endpoints (distinct from `/me/profile`, the athlete
/// profile) — used by `AppState` to persist onboarding completion server-side.
final class UserAPI {
    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    func fetchCurrentUser() async throws -> User {
        try await client.get("me")
    }

    func update(fullName: String? = nil, hasCompletedOnboarding: Bool? = nil) async throws -> User {
        try await client.send(.put, "me", body: UpdateUserRequest(fullName: fullName, hasCompletedOnboarding: hasCompletedOnboarding))
    }

    @discardableResult
    func updateLocation(_ location: String?) async throws -> User {
        try await client.send(.put, "me", body: UpdateLocationRequest(location: location))
    }
}

/// `location: String?`'s default synthesized `Encodable` would use
/// `encodeIfPresent`, silently omitting the key when nil — indistinguishable
/// from "don't touch this field" server-side. Manual encoding always sends
/// the key, so `nil` maps to an explicit JSON `null` (clear the location).
private struct UpdateLocationRequest: Encodable {
    let location: String?

    private enum CodingKeys: String, CodingKey { case location }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(location, forKey: .location)
    }
}
