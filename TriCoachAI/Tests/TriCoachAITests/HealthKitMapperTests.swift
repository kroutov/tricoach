import HealthKit
import XCTest
@testable import TriCoachAI

/// `HKWorkout`/`HKCategorySample` can be constructed in-memory without
/// HealthKit authorization (only *querying* the real store needs it), so
/// the mapping layer is fully testable even where live HealthKit access
/// isn't (see `HealthKitProvider.swift` doc comment).
final class HealthKitMapperTests: XCTestCase {
    func testSportTypeMapping() {
        XCTAssertEqual(HealthKitMapper.sportType(for: .running), .run)
        XCTAssertEqual(HealthKitMapper.sportType(for: .cycling), .bike)
        XCTAssertEqual(HealthKitMapper.sportType(for: .swimming), .swim)
        XCTAssertEqual(HealthKitMapper.sportType(for: .traditionalStrengthTraining), .strength)
    }

    func testCompletedActivityMapsCoreFields() {
        let start = Date(timeIntervalSince1970: 1_700_000_000)
        let end = start.addingTimeInterval(3600)
        let workout = HKWorkout(
            activityType: .running,
            start: start,
            end: end,
            duration: 3600,
            totalEnergyBurned: nil,
            totalDistance: HKQuantity(unit: .meter(), doubleValue: 10_000),
            metadata: nil
        )

        let activity = HealthKitMapper.completedActivity(from: workout)

        XCTAssertEqual(activity.source, .healthKit)
        XCTAssertEqual(activity.sport, .run)
        XCTAssertEqual(activity.durationS, 3600)
        XCTAssertEqual(activity.distanceM, 10_000)
        XCTAssertEqual(activity.startTime, start)
        XCTAssertEqual(activity.externalId, workout.uuid.uuidString)
    }

    func testSleepDurationSumsOnlyAsleepSamples() {
        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            return XCTFail("sleepAnalysis type unavailable")
        }
        let night = Date(timeIntervalSince1970: 1_700_000_000)
        let asleepCore = HKCategorySample(
            type: sleepType, value: HKCategoryValueSleepAnalysis.asleepCore.rawValue,
            start: night, end: night.addingTimeInterval(4 * 3600)
        )
        let asleepDeep = HKCategorySample(
            type: sleepType, value: HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
            start: night.addingTimeInterval(4 * 3600), end: night.addingTimeInterval(6 * 3600)
        )
        let awake = HKCategorySample(
            type: sleepType, value: HKCategoryValueSleepAnalysis.awake.rawValue,
            start: night.addingTimeInterval(6 * 3600), end: night.addingTimeInterval(6.5 * 3600)
        )

        let minutes = HealthKitMapper.sleepDurationMinutes(from: [asleepCore, asleepDeep, awake])

        XCTAssertEqual(minutes, 6 * 60) // 4h + 2h asleep, "awake" excluded
    }
}
