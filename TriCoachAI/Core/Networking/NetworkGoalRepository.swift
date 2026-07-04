import Foundation

final class NetworkGoalRepository: GoalRepository {
    private let client: APIClient
    private let cache: SwiftDataGoalRepository

    init(client: APIClient = .shared, cache: SwiftDataGoalRepository) {
        self.client = client
        self.cache = cache
    }

    func fetchGoals() async throws -> [Goal] {
        do {
            let goals: [Goal] = try await client.get("me/goals")
            cache.replaceAll(goals)
            return goals
        } catch {
            return cache.fetchGoals()
        }
    }

    func save(_ goal: Goal) async throws {
        let knownIds = Set(cache.fetchGoals().map(\.id))
        let saved: Goal = knownIds.contains(goal.id)
            ? try await client.send(.put, "me/goals/\(goal.id.uuidString)", body: goal)
            : try await client.send(.post, "me/goals", body: goal)
        cache.save(saved)
    }

    func delete(id: UUID) async throws {
        try await client.sendNoContent(.delete, "me/goals/\(id.uuidString)")
        cache.delete(id: id)
    }
}
