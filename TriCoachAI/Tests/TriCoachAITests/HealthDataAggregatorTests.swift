import XCTest
@testable import TriCoachAI

final class HealthDataAggregatorTests: XCTestCase {
    private func activity(source: ActivitySource, sport: SportType, start: Date) -> CompletedActivity {
        CompletedActivity(source: source, startTime: start, durationS: 3600, sport: sport)
    }

    func testDeduplicatesSameSessionAcrossSources() {
        let start = Date()
        let healthKitActivity = activity(source: .healthKit, sport: .run, start: start)
        let stravaActivity = activity(source: .strava, sport: .run, start: start.addingTimeInterval(90))

        let merged = HealthDataAggregator.deduplicate([healthKitActivity, stravaActivity])

        XCTAssertEqual(merged.count, 1)
        XCTAssertEqual(merged.first?.source, .healthKit, "HealthKit should win over Strava on conflict")
    }

    func testKeepsDistinctSessionsOnDifferentDays() {
        let today = activity(source: .healthKit, sport: .run, start: Date())
        let yesterday = activity(source: .strava, sport: .run, start: Date().addingTimeInterval(-86_400))

        let merged = HealthDataAggregator.deduplicate([today, yesterday])

        XCTAssertEqual(merged.count, 2)
    }

    func testKeepsSameTimeDifferentSportAsDistinct() {
        let start = Date()
        let run = activity(source: .healthKit, sport: .run, start: start)
        let bike = activity(source: .strava, sport: .bike, start: start)

        let merged = HealthDataAggregator.deduplicate([run, bike])

        XCTAssertEqual(merged.count, 2, "A brick session logged as two sports shouldn't be collapsed into one")
    }
}
