import Foundation
import SwiftData

final class SwiftDataUserSessionRepository: UserSessionRepository {
    private let context: ModelContext
    init(context: ModelContext) { self.context = context }

    func currentUser() -> User? {
        guard let record = try? context.fetch(FetchDescriptor<UserRecord>()).first else { return nil }
        return try? JSONDecoder.tricoach.decode(User.self, from: record.payload)
    }

    func save(_ user: User) {
        let payload = (try? JSONEncoder.tricoach.encode(user)) ?? Data()
        if let existing = try? context.fetch(FetchDescriptor<UserRecord>()).first {
            existing.appleUserId = user.appleUserId
            existing.payload = payload
        } else {
            context.insert(UserRecord(id: user.id, appleUserId: user.appleUserId, payload: payload))
        }
        try? context.save()
    }

    func signOut() {
        (try? context.fetch(FetchDescriptor<UserRecord>()))?.forEach(context.delete)
        try? context.save()
    }
}

/// Local SwiftData cache. Phase 2's `NetworkProfileRepository` writes
/// through to this after every successful call and falls back to it when
/// the backend is unreachable.
final class SwiftDataProfileRepository: ProfileRepository {
    private let context: ModelContext
    init(context: ModelContext) { self.context = context }

    func loadProfile() -> AthleteProfile {
        guard let record = try? context.fetch(FetchDescriptor<ProfileRecord>()).first,
              let profile = try? JSONDecoder.tricoach.decode(AthleteProfile.self, from: record.payload)
        else { return .empty }
        return profile
    }

    func save(_ profile: AthleteProfile) {
        var profile = profile
        profile.updatedAt = .now
        let payload = (try? JSONEncoder.tricoach.encode(profile)) ?? Data()
        if let existing = try? context.fetch(FetchDescriptor<ProfileRecord>()).first {
            existing.payload = payload
            existing.updatedAt = profile.updatedAt
        } else {
            context.insert(ProfileRecord(payload: payload))
        }
        try? context.save()
    }

    func loadAvailability() -> Availability {
        guard let record = try? context.fetch(FetchDescriptor<AvailabilityRecord>()).first,
              let availability = try? JSONDecoder.tricoach.decode(Availability.self, from: record.payload)
        else { return .default }
        return availability
    }

    func save(_ availability: Availability) {
        var availability = availability
        availability.updatedAt = .now
        let payload = (try? JSONEncoder.tricoach.encode(availability)) ?? Data()
        if let existing = try? context.fetch(FetchDescriptor<AvailabilityRecord>()).first {
            existing.payload = payload
            existing.updatedAt = availability.updatedAt
        } else {
            context.insert(AvailabilityRecord(payload: payload))
        }
        try? context.save()
    }
}

/// Local SwiftData cache backing `NetworkGoalRepository`.
final class SwiftDataGoalRepository: GoalRepository {
    private let context: ModelContext
    init(context: ModelContext) { self.context = context }

    func fetchGoals() -> [Goal] {
        let records = (try? context.fetch(FetchDescriptor<GoalRecord>(sortBy: [SortDescriptor(\.targetDate)]))) ?? []
        return records.compactMap { try? JSONDecoder.tricoach.decode(Goal.self, from: $0.payload) }
    }

    func save(_ goal: Goal) {
        let payload = (try? JSONEncoder.tricoach.encode(goal)) ?? Data()
        let goalId = goal.id
        if let existing = try? context.fetch(FetchDescriptor<GoalRecord>(predicate: #Predicate { $0.id == goalId })).first {
            existing.targetDate = goal.targetDate
            existing.status = goal.status.rawValue
            existing.payload = payload
        } else {
            context.insert(GoalRecord(id: goal.id, targetDate: goal.targetDate, status: goal.status.rawValue, payload: payload))
        }
        try? context.save()
    }

    func delete(id: UUID) {
        if let existing = try? context.fetch(FetchDescriptor<GoalRecord>(predicate: #Predicate { $0.id == id })).first {
            context.delete(existing)
            try? context.save()
        }
    }

    func replaceAll(_ goals: [Goal]) {
        (try? context.fetch(FetchDescriptor<GoalRecord>()))?.forEach(context.delete)
        goals.forEach(save)
    }
}

/// Local SwiftData cache backing `NetworkCheckInRepository`.
final class SwiftDataCheckInRepository: CheckInRepository {
    private let context: ModelContext
    init(context: ModelContext) { self.context = context }

    func fetchRecentCheckIns(days: Int) -> [ConstraintCheckIn] {
        let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: .now) ?? .distantPast
        let records = (try? context.fetch(
            FetchDescriptor<CheckInRecord>(predicate: #Predicate { $0.date >= cutoff }, sortBy: [SortDescriptor(\.date, order: .reverse)])
        )) ?? []
        return records.compactMap { try? JSONDecoder.tricoach.decode(ConstraintCheckIn.self, from: $0.payload) }
    }

    func save(_ checkIn: ConstraintCheckIn) {
        let payload = (try? JSONEncoder.tricoach.encode(checkIn)) ?? Data()
        context.insert(CheckInRecord(id: checkIn.id, date: checkIn.date, payload: payload))
        try? context.save()
    }
}

/// Local SwiftData cache backing `NetworkPlanRepository`. Also doubles as
/// the fully offline `PlanGenerationStrategy` path (Core/PlanEngine), reusing
/// the Phase 1 engine when the backend can't be reached.
final class SwiftDataPlanRepository: PlanRepository {
    private let context: ModelContext
    private let profileRepository: ProfileRepository
    private let goalRepository: GoalRepository
    private let planGenerationStrategy: PlanGenerationStrategy

    init(
        context: ModelContext,
        profileRepository: ProfileRepository,
        goalRepository: GoalRepository,
        planGenerationStrategy: PlanGenerationStrategy = RuleBasedPlanStrategy()
    ) {
        self.context = context
        self.profileRepository = profileRepository
        self.goalRepository = goalRepository
        self.planGenerationStrategy = planGenerationStrategy
    }

    func fetchPlans() -> [TrainingPlan] {
        let records = (try? context.fetch(FetchDescriptor<TrainingPlanRecord>(sortBy: [SortDescriptor(\.startDate, order: .reverse)]))) ?? []
        return records.compactMap { try? JSONDecoder.tricoach.decode(TrainingPlan.self, from: $0.payload) }
    }

    func fetchActivePlan() -> TrainingPlan? {
        fetchPlans().first { $0.status == .active }
    }

    func generatePlan(goalId: UUID, durationWeeks: Int?) async throws -> TrainingPlan {
        let profile = try await profileRepository.loadProfile()
        let availability = try await profileRepository.loadAvailability()
        guard let goal = try await goalRepository.fetchGoals().first(where: { $0.id == goalId }) else {
            throw RepositoryError.notFound
        }
        let context = PlanGenerationContext(profile: profile, goal: goal, availability: availability, explicitDurationWeeks: durationWeeks)
        let plan = planGenerationStrategy.generate(context: context)
        save(plan)
        return plan
    }

    func save(_ plan: TrainingPlan) {
        let payload = (try? JSONEncoder.tricoach.encode(plan)) ?? Data()
        let planId = plan.id
        if let existing = try? context.fetch(FetchDescriptor<TrainingPlanRecord>(predicate: #Predicate { $0.id == planId })).first {
            existing.startDate = plan.startDate
            existing.endDate = plan.endDate
            existing.status = plan.status.rawValue
            existing.payload = payload
        } else {
            context.insert(TrainingPlanRecord(id: plan.id, goalId: plan.goalId, startDate: plan.startDate, endDate: plan.endDate, status: plan.status.rawValue, payload: payload))
        }
        try? context.save()
    }
}

enum RepositoryError: Error {
    case notFound
}

final class SwiftDataActivityRepository: ActivityRepository {
    private let context: ModelContext
    init(context: ModelContext) { self.context = context }

    func fetchActivities(from: Date, to: Date) -> [CompletedActivity] {
        let records = (try? context.fetch(
            FetchDescriptor<ActivityRecord>(predicate: #Predicate { $0.startTime >= from && $0.startTime <= to }, sortBy: [SortDescriptor(\.startTime)])
        )) ?? []
        return records.compactMap { try? JSONDecoder.tricoach.decode(CompletedActivity.self, from: $0.payload) }
    }

    func save(_ activity: CompletedActivity) {
        let payload = (try? JSONEncoder.tricoach.encode(activity)) ?? Data()
        context.insert(ActivityRecord(id: activity.id, startTime: activity.startTime, payload: payload))
        try? context.save()
    }
}

/// Local SwiftData cache backing `NetworkAdaptationEventRepository`.
final class SwiftDataAdaptationEventRepository: AdaptationEventRepository {
    private let context: ModelContext
    init(context: ModelContext) { self.context = context }

    func fetchEvents(planId: UUID) -> [AdaptationEvent] {
        let records = (try? context.fetch(
            FetchDescriptor<AdaptationEventRecord>(predicate: #Predicate { $0.planId == planId }, sortBy: [SortDescriptor(\.createdAt, order: .reverse)])
        )) ?? []
        return records.compactMap { try? JSONDecoder.tricoach.decode(AdaptationEvent.self, from: $0.payload) }
    }

    func save(_ event: AdaptationEvent) {
        let payload = (try? JSONEncoder.tricoach.encode(event)) ?? Data()
        context.insert(AdaptationEventRecord(id: event.id, planId: event.planId, createdAt: event.createdAt, payload: payload))
        try? context.save()
    }
}
