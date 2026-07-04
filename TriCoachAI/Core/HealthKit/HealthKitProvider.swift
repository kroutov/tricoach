import Foundation
import HealthKit

/// Maps HealthKit's types to TriCoach AI's domain models. Split out from
/// `HealthKitManager` (which only talks to `HKHealthStore`) so the mapping
/// logic can be unit tested with `HKWorkout`/`HKQuantitySample` fixtures
/// built in-memory — construction doesn't require HealthKit authorization,
/// only querying the real store does.
enum HealthKitMapper {
    static func sportType(for activityType: HKWorkoutActivityType) -> SportType {
        switch activityType {
        case .running, .walking, .hiking: return .run
        case .cycling, .handCycling: return .bike
        case .swimming: return .swim
        case .traditionalStrengthTraining, .functionalStrengthTraining, .coreTraining: return .strength
        default: return .run
        }
    }

    static func completedActivity(from workout: HKWorkout) -> CompletedActivity {
        let avgHr = workout.statistics(for: HKQuantityType(.heartRate))?
            .averageQuantity()?
            .doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
        let avgPower = workout.statistics(for: HKQuantityType(.cyclingPower))?
            .averageQuantity()?
            .doubleValue(for: .watt())

        return CompletedActivity(
            source: .healthKit,
            externalId: workout.uuid.uuidString,
            startTime: workout.startDate,
            durationS: Int(workout.duration),
            distanceM: workout.totalDistance?.doubleValue(for: .meter()),
            avgHr: avgHr.map(Int.init),
            maxHr: nil,
            avgPowerWatts: avgPower.map(Int.init),
            avgPaceSecPerKm: nil,
            elevationGainM: nil,
            sport: sportType(for: workout.workoutActivityType)
        )
    }

    /// Sums "asleep" category samples into a single night's duration. Naive
    /// bucketing by the sample's start day — good enough for a nightly
    /// summary, not a full sleep-stage breakdown.
    static func sleepDurationMinutes(from samples: [HKCategorySample]) -> Int {
        let asleepValues: Set<Int> = [
            HKCategoryValueSleepAnalysis.asleepCore.rawValue,
            HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
            HKCategoryValueSleepAnalysis.asleepREM.rawValue,
            HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
        ]
        let totalSeconds = samples
            .filter { asleepValues.contains($0.value) }
            .reduce(0.0) { $0 + $1.endDate.timeIntervalSince($1.startDate) }
        return Int(totalSeconds / 60)
    }
}

struct HealthKitProvider: ActivityDataProvider, HealthMetricsProvider {
    let source: ActivitySource = .healthKit
    private let manager: HealthKitManager

    init(manager: HealthKitManager = HealthKitManager()) {
        self.manager = manager
    }

    func fetchRecentActivities(since: Date) async throws -> [CompletedActivity] {
        try await manager.fetchRecentWorkouts(since: since).map(HealthKitMapper.completedActivity)
    }

    func fetchRecentHealthMetrics(since: Date) async throws -> [HealthMetricsDaily] {
        async let restingHr = manager.fetchLatestQuantitySample(identifier: .restingHeartRate, since: since)
        async let hrv = manager.fetchLatestQuantitySample(identifier: .heartRateVariabilitySDNN, since: since)
        async let vo2max = manager.fetchLatestQuantitySample(identifier: .vo2Max, since: since)
        async let sleepSamples = manager.fetchSleepSamples(since: since)

        let (restingHrSample, hrvSample, vo2maxSample, sleep) = try await (restingHr, hrv, vo2max, sleepSamples)

        var metrics = HealthMetricsDaily(date: .now)
        metrics.restingHr = restingHrSample.map { Int($0.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))) }
        metrics.hrvMs = hrvSample?.quantity.doubleValue(for: .secondUnit(with: .milli))
        metrics.vo2max = vo2maxSample?.quantity.doubleValue(for: HKUnit(from: "mL/kg*min"))
        metrics.sleepDurationMin = sleep.isEmpty ? nil : HealthKitMapper.sleepDurationMinutes(from: sleep)
        return [metrics]
    }
}
