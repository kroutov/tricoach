import Foundation

final class DashboardAPI {
    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    func fetchAnalytics() async throws -> DashboardAnalytics {
        try await client.get("dashboard/analytics")
    }
}
