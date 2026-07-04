import Foundation

struct AuthResponse: Codable {
    let token: String
    let user: User
}

private struct AppleSignInRequest: Codable {
    let identityToken: String
    let fullName: String?
}

private struct DevLoginRequest: Codable {
    let appleUserId: String
    let email: String?
    let fullName: String?
}

/// Handles the pre-session auth exchange only — everything after login goes
/// through the authenticated `APIClient` (Bearer token from Keychain).
final class AuthAPIClient {
    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    func signInWithApple(identityToken: String, fullName: String?) async throws -> AuthResponse {
        try await client.send(.post, "auth/apple", body: AppleSignInRequest(identityToken: identityToken, fullName: fullName))
    }

    /// Mirrors the backend's dev-only bypass — lets "mode démo" round-trip
    /// through the real server without a configured Apple Developer Team.
    func devLogin(appleUserId: String, email: String?, fullName: String?) async throws -> AuthResponse {
        try await client.send(.post, "auth/dev-login", body: DevLoginRequest(appleUserId: appleUserId, email: email, fullName: fullName))
    }

    func refresh() async throws -> String {
        let response: RefreshResponse = try await client.send(.post, "auth/refresh")
        return response.token
    }
}

private struct RefreshResponse: Codable {
    let token: String
}
