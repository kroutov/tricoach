import Foundation

/// Common shape for anything that can supply completed activities and daily
/// health metrics — implemented today by `HealthKitProvider` and (once
/// connected) `StravaProvider`. A future `GarminConnectProvider` could
/// implement the same protocol without touching `HealthDataAggregator` or
/// any call site (see plan §1).
protocol ActivityDataProvider {
    var source: ActivitySource { get }
    func fetchRecentActivities(since: Date) async throws -> [CompletedActivity]
}

protocol HealthMetricsProvider {
    func fetchRecentHealthMetrics(since: Date) async throws -> [HealthMetricsDaily]
}
