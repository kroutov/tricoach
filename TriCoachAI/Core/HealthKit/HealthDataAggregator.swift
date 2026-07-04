import Foundation

/// Merges activities from every connected `ActivityDataProvider`
/// (HealthKit, Strava, ...) and dedupes sessions that show up from more
/// than one source so training load isn't double-counted (see plan §1).
struct HealthDataAggregator {
    let providers: [ActivityDataProvider]

    func fetchMergedActivities(since: Date) async -> [CompletedActivity] {
        var all: [CompletedActivity] = []
        for provider in providers {
            if let activities = try? await provider.fetchRecentActivities(since: since) {
                all.append(contentsOf: activities)
            }
        }
        return Self.deduplicate(all)
    }

    /// Matches by start-time proximity (within 5 minutes) and sport, since
    /// the same session synced from two sources rarely has identical
    /// timestamps. HealthKit wins on conflict — it reflects the recording
    /// device directly, whereas Strava may have processed/rounded the data.
    static func deduplicate(_ activities: [CompletedActivity]) -> [CompletedActivity] {
        let priorityOrdered = activities.sorted { $0.source == .healthKit && $1.source != .healthKit }
        var result: [CompletedActivity] = []
        for activity in priorityOrdered {
            let isDuplicate = result.contains {
                $0.sport == activity.sport && abs($0.startTime.timeIntervalSince(activity.startTime)) < 5 * 60
            }
            if !isDuplicate {
                result.append(activity)
            }
        }
        return result.sorted { $0.startTime < $1.startTime }
    }
}
