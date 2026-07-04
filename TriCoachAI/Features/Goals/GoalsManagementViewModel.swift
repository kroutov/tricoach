import Foundation
import Observation

@MainActor
@Observable
final class GoalsManagementViewModel {
    var goals: [Goal] = []
    var isLoading = false
    var errorMessage: String?
    var isRegenerating = false
    var regenerationMessage: String?

    private let goalRepository: GoalRepository
    private let planRepository: PlanRepository

    init(container: DependencyContainer) {
        goalRepository = container.goalRepository
        planRepository = container.planRepository
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            goals = try await goalRepository.fetchGoals()
        } catch {
            errorMessage = "Impossible de charger les objectifs : \(error.localizedDescription)"
        }
    }

    func isKnown(_ goal: Goal) -> Bool {
        goals.contains { $0.id == goal.id }
    }

    /// `NetworkGoalRepository.save` POSTs when the id isn't in its local
    /// cache yet and PUTs otherwise — reloading afterwards keeps `goals`
    /// (and therefore `isKnown`) in sync with the server-assigned id/state.
    func save(_ goal: Goal) async {
        errorMessage = nil
        do {
            try await goalRepository.save(goal)
            await load()
        } catch {
            errorMessage = "Impossible d'enregistrer l'objectif : \(error.localizedDescription)"
        }
    }

    func delete(_ goal: Goal) async {
        errorMessage = nil
        do {
            try await goalRepository.delete(id: goal.id)
            goals.removeAll { $0.id == goal.id }
        } catch {
            errorMessage = "Impossible de supprimer l'objectif : \(error.localizedDescription)"
        }
    }

    /// Regenerates the active plan from the current priority-A goal (or the
    /// first goal if none is A) — archives whatever plan was active
    /// server-side (see `POST /plans/generate`).
    func regeneratePlan() async {
        guard let primaryGoal = goals.first(where: { $0.priority == .a }) ?? goals.first else {
            errorMessage = "Ajoutez au moins un objectif avant de générer un plan."
            return
        }
        isRegenerating = true
        regenerationMessage = nil
        errorMessage = nil
        defer { isRegenerating = false }
        do {
            _ = try await planRepository.generatePlan(goalId: primaryGoal.id, durationWeeks: nil)
            regenerationMessage = "Nouveau plan généré à partir de « \(primaryGoal.type.label) »."
        } catch {
            errorMessage = "Impossible de générer le plan : \(error.localizedDescription)"
        }
    }
}
