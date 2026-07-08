import Foundation
import HealthKit

enum HealthKitError: Error, LocalizedError {
    case unavailable
    case authorizationDenied

    var errorDescription: String? {
        switch self {
        case .unavailable: return "Santé n'est pas disponible sur cet appareil."
        case .authorizationDenied: return "Accès à Santé refusé. Activez-le dans Réglages > Confidentialité > Santé > TriCoach AI."
        }
    }
}

/// Reads workouts, sleep, HRV, VO2max and resting HR from HealthKit. This is
/// TriCoach AI's primary activity/health data source (see plan §1): most
/// wearables — Garmin included — write into Apple Health via their own
/// companion app, so reading HealthKit picks up that data without ever
/// touching a vendor API.
final class HealthKitManager {
    private let store = HKHealthStore()

    static let readTypes: Set<HKObjectType> = {
        var types: Set<HKObjectType> = [
            HKObjectType.workoutType(),
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
            HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN)!,
            HKObjectType.quantityType(forIdentifier: .restingHeartRate)!,
            HKObjectType.quantityType(forIdentifier: .vo2Max)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
        ]
        if let cyclingPower = HKObjectType.quantityType(forIdentifier: .cyclingPower) {
            types.insert(cyclingPower)
        }
        if let runningPower = HKObjectType.quantityType(forIdentifier: .runningPower) {
            types.insert(runningPower)
        }
        return types
    }()

    var isAvailable: Bool { HKHealthStore.isHealthDataAvailable() }

    func requestAuthorization() async throws {
        guard isAvailable else { throw HealthKitError.unavailable }
        try await store.requestAuthorization(toShare: [], read: Self.readTypes)
    }

    /// HealthKit only tells you whether the *prompt* was shown, not whether
    /// access was granted (by design, to avoid leaking what data exists) —
    /// so callers should attempt a read and treat an empty/error result as
    /// "no access" rather than relying on a status check.
    func authorizationStatus(for type: HKObjectType) -> HKAuthorizationStatus {
        store.authorizationStatus(for: type)
    }

    func fetchRecentWorkouts(since: Date, limit: Int = 50) async throws -> [HKWorkout] {
        let predicate = HKQuery.predicateForSamples(withStart: since, end: .now)
        let sort = [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: .workoutType(), predicate: predicate, limit: limit, sortDescriptors: sort) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: (samples as? [HKWorkout]) ?? [])
            }
            store.execute(query)
        }
    }

    func fetchLatestQuantitySample(identifier: HKQuantityTypeIdentifier, since: Date) async throws -> HKQuantitySample? {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier) else { return nil }
        let predicate = HKQuery.predicateForSamples(withStart: since, end: .now)
        let sort = [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: 1, sortDescriptors: sort) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: (samples as? [HKQuantitySample])?.first)
            }
            store.execute(query)
        }
    }

    func fetchSleepSamples(since: Date) async throws -> [HKCategorySample] {
        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return [] }
        let predicate = HKQuery.predicateForSamples(withStart: since, end: .now)
        let sort = [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: 50, sortDescriptors: sort) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: (samples as? [HKCategorySample]) ?? [])
            }
            store.execute(query)
        }
    }
}
