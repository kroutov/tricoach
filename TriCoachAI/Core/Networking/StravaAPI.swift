import Foundation

struct StravaAuthURLResponse: Codable {
    let url: URL
}

struct StravaStatusResponse: Codable {
    let connected: Bool
    let connectedAt: Date?
}

struct StravaSyncResponse: Codable {
    let activitiesIngested: Int
    let adaptationEvents: [AdaptationEvent]
}

final class StravaAPI {
    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    func authURL() async throws -> URL {
        let response: StravaAuthURLResponse = try await client.get("integrations/strava/auth-url")
        return response.url
    }

    func status() async throws -> StravaStatusResponse {
        try await client.get("integrations/strava/status")
    }

    func disconnect() async throws {
        try await client.sendNoContent(.delete, "integrations/strava")
    }

    func sync() async throws -> StravaSyncResponse {
        try await client.send(.post, "integrations/strava/sync")
    }
}
