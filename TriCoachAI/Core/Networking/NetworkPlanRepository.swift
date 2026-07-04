import Foundation

final class NetworkPlanRepository: PlanRepository {
    private let client: APIClient
    private let cache: SwiftDataPlanRepository

    init(client: APIClient = .shared, cache: SwiftDataPlanRepository) {
        self.client = client
        self.cache = cache
    }

    func fetchPlans() async throws -> [TrainingPlan] {
        do {
            let plans: [TrainingPlan] = try await client.get("plans")
            plans.forEach(cache.save)
            return plans
        } catch {
            return cache.fetchPlans()
        }
    }

    func fetchActivePlan() async throws -> TrainingPlan? {
        try await fetchPlans().first { $0.status == .active }
    }

    /// Generation always requires the server — it owns the periodization
    /// algorithm as the single source of truth from Phase 2 onward (see
    /// plan §6 "Tradeoff assumé"). No offline fallback here by design.
    func generatePlan(goalId: UUID, durationWeeks: Int?) async throws -> TrainingPlan {
        let plan: TrainingPlan = try await client.send(.post, "plans/generate", body: GeneratePlanRequest(goalId: goalId, durationWeeks: durationWeeks))
        cache.save(plan)
        return plan
    }
}

private struct GeneratePlanRequest: Encodable {
    let goalId: UUID
    let durationWeeks: Int?
}
