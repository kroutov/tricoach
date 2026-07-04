import Foundation

private struct HealthKitSyncRequest: Encodable {
    let activities: [CompletedActivity]
    let healthMetrics: [HealthMetricsDaily]
}

struct HealthKitSyncResponse: Codable {
    let activitiesIngested: Int
    let adaptationEvents: [AdaptationEvent]
}

final class HealthKitSyncAPI {
    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    func sync(activities: [CompletedActivity], healthMetrics: [HealthMetricsDaily]) async throws -> HealthKitSyncResponse {
        try await client.send(.post, "integrations/healthkit/sync", body: HealthKitSyncRequest(activities: activities, healthMetrics: healthMetrics))
    }
}
