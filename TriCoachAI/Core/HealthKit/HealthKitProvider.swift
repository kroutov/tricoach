import Foundation
import HealthKit

/// Maps HealthKit's types to TriCoach AI's domain models. Split out from
/// `HealthKitManager` (which only talks to `HKHealthStore`) so the mapping
/// logic can be unit tested with `HKWorkout`/`HKQuantitySample` fixtures
/// built in-memory — construction doesn't require HealthKit authorization,
/// only querying the real store does.
enum HealthKitMapper {
    /// `SportType` only has 6 cases (shared verbatim with the backend's Prisma
    /// enum and the web frontend's TS type — adding a 7th would mean a
    /// three-way migration, out of scope here), so anything genuinely
    /// cross-training (rowing, elliptical, HIIT, yoga...) falls back to
    /// `.strength` rather than the old default of `.run` — silently
    /// attributing an elliptical session to running would pollute
    /// run-specific pace/threshold calculations.
    static func sportType(for activityType: HKWorkoutActivityType) -> SportType {
        switch activityType {
        case .running, .walking, .hiking, .trackAndField: return .run
        case .cycling, .handCycling: return .bike
        case .swimming: return .swim
        case .swimBikeRun: return .brick
        default: return .strength
        }
    }

    static func completedActivity(from workout: HKWorkout) -> CompletedActivity {
        let sport = sportType(for: workout.workoutActivityType)

        let avgHr = workout.statistics(for: HKQuantityType(.heartRate))?
            .averageQuantity()?
            .doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
        let maxHr = workout.statistics(for: HKQuantityType(.heartRate))?
            .maximumQuantity()?
            .doubleValue(for: HKUnit.count().unitDivided(by: .minute()))

        // Cycling and running power come from different HealthKit quantity
        // types, and only one is ever meaningful per workout — pick by sport
        // rather than checking both, since a run would never have cycling
        // power statistics attached (and vice versa).
        let powerType: HKQuantityTypeIdentifier? = sport == .bike ? .cyclingPower : (sport == .run ? .runningPower : nil)
        let avgPower = powerType.flatMap { workout.statistics(for: HKQuantityType($0))?.averageQuantity()?.doubleValue(for: .watt()) }

        let distanceM = workout.totalDistance?.doubleValue(for: .meter())
        // Only meaningful for running — bike pace is normally expressed as
        // speed, and swim pace as time/100m, neither of which this
        // sec-per-km field represents.
        let avgPaceSecPerKm: Int? = {
            guard sport == .run, let distanceM, distanceM > 0 else { return nil }
            return Int(workout.duration / (distanceM / 1000))
        }()

        let elevationGainM = (workout.metadata?[HKMetadataKeyElevationAscended] as? HKQuantity)?.doubleValue(for: .meter())

        return CompletedActivity(
            source: .healthKit,
            externalId: workout.uuid.uuidString,
            startTime: workout.startDate,
            durationS: Int(workout.duration),
            distanceM: distanceM,
            avgHr: avgHr.map(Int.init),
            maxHr: maxHr.map(Int.init),
            avgPowerWatts: avgPower.map(Int.init),
            avgPaceSecPerKm: avgPaceSecPerKm,
            elevationGainM: elevationGainM,
            sport: sport
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
        // See IntegrationsViewModel.pushHealthKitData for why 500 rather than
        // the manager's own default of 50 or a fully unbounded query.
        try await manager.fetchRecentWorkouts(since: since, limit: 500).map(HealthKitMapper.completedActivity)
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
