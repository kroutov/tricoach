import Foundation
import Observation

@MainActor
@Observable
final class DashboardAnalyticsViewModel {
    private(set) var analytics: DashboardAnalytics?
    var isLoading = false
    var errorMessage: String?

    private let dashboardAPI: DashboardAPI

    init(container: DependencyContainer) {
        dashboardAPI = container.dashboardAPI
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            analytics = try await dashboardAPI.fetchAnalytics()
        } catch {
            errorMessage = "Impossible de charger l'analytique : \(error.localizedDescription)"
        }
    }

    var hasActivePlan: Bool { analytics?.hasActivePlan ?? false }
    var weeklyLoad: [WeeklyLoadPoint] { analytics?.weeklyLoad ?? [] }
    var loadForm: [LoadFormPoint] { analytics?.loadForm ?? [] }
    var zoneDistribution: [ZoneDistributionPoint] { analytics?.zoneDistribution ?? [] }
    var vo2maxTrend: [VO2MaxPoint] { analytics?.vo2maxTrend ?? [] }
}
