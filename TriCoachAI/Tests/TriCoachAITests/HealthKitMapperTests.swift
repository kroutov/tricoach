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

    func testSportTypeMapsTriathlonToBrick() {
        XCTAssertEqual(HealthKitMapper.sportType(for: .swimBikeRun), .brick)
    }

    /// Cross-training types with no natural home in the 6-case `SportType`
    /// enum used to silently default to `.run`, polluting run-specific pace
    /// analytics — `.strength` is the safer fallback.
    func testSportTypeDefaultsUnrecognizedTypesToStrengthNotRun() {
        XCTAssertEqual(HealthKitMapper.sportType(for: .rowing), .strength)
        XCTAssertEqual(HealthKitMapper.sportType(for: .yoga), .strength)
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

    func testComputesPaceForRunningWorkoutsOnly() {
        let start = Date(timeIntervalSince1970: 1_700_000_000)
        let run = HKWorkout(
            activityType: .running, start: start, end: start.addingTimeInterval(1800), duration: 1800,
            totalEnergyBurned: nil, totalDistance: HKQuantity(unit: .meter(), doubleValue: 5_000), metadata: nil
        )
        // 1800s / 5km = 360s/km (6:00/km)
        XCTAssertEqual(HealthKitMapper.completedActivity(from: run).avgPaceSecPerKm, 360)

        let ride = HKWorkout(
            activityType: .cycling, start: start, end: start.addingTimeInterval(3600), duration: 3600,
            totalEnergyBurned: nil, totalDistance: HKQuantity(unit: .meter(), doubleValue: 30_000), metadata: nil
        )
        XCTAssertNil(HealthKitMapper.completedActivity(from: ride).avgPaceSecPerKm)
    }

    func testMapsElevationGainFromWorkoutMetadata() {
        let start = Date(timeIntervalSince1970: 1_700_000_000)
        let workout = HKWorkout(
            activityType: .running, start: start, end: start.addingTimeInterval(3600), duration: 3600,
            totalEnergyBurned: nil, totalDistance: HKQuantity(unit: .meter(), doubleValue: 10_000),
            metadata: [HKMetadataKeyElevationAscended: HKQuantity(unit: .meter(), doubleValue: 250)]
        )
        XCTAssertEqual(HealthKitMapper.completedActivity(from: workout).elevationGainM, 250)
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
