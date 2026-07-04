import Foundation

/// Repository abstractions the rest of the app codes against. Phase 1 used
/// local-only (SwiftData) implementations; Phase 2 adds network-backed
/// implementations behind the same protocols (see Core/Networking/Network*Repository.swift)
/// so ViewModels only gained `await`, not new call shapes.
/// `UserSessionRepository` and `ActivityRepository` stay local-only: the
/// former is a fast local session cache (the real auth round-trip happens
/// once via `AuthAPIClient`), the latter is Phase 3 HealthKit/Strava
/// ingestion cache territory.

protocol UserSessionRepository {
    func currentUser() -> User?
    func save(_ user: User)
    func signOut()
}

protocol ProfileRepository {
    func loadProfile() async throws -> AthleteProfile
    func save(_ profile: AthleteProfile) async throws
    func loadAvailability() async throws -> Availability
    func save(_ availability: Availability) async throws
}

protocol GoalRepository {
    func fetchGoals() async throws -> [Goal]
    func save(_ goal: Goal) async throws
    func delete(id: UUID) async throws
}

protocol CheckInRepository {
    func fetchRecentCheckIns(days: Int) async throws -> [ConstraintCheckIn]
    func save(_ checkIn: ConstraintCheckIn) async throws
}

protocol PlanRepository {
    func fetchPlans() async throws -> [TrainingPlan]
    func fetchActivePlan() async throws -> TrainingPlan?
    func generatePlan(goalId: UUID, durationWeeks: Int?) async throws -> TrainingPlan
}

protocol ActivityRepository {
    func fetchActivities(from: Date, to: Date) -> [CompletedActivity]
    func save(_ activity: CompletedActivity)
}

protocol AdaptationEventRepository {
    func fetchEvents(planId: UUID) async throws -> [AdaptationEvent]
}
