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
}
