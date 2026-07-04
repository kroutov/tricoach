import Foundation
import Observation

@MainActor
@Observable
final class AdaptationHistoryViewModel {
    var events: [AdaptationEvent] = []
    var isLoading = false
    var errorMessage: String?

    private let planRepository: PlanRepository
    private let adaptationEventRepository: AdaptationEventRepository

    init(container: DependencyContainer) {
        planRepository = container.planRepository
        adaptationEventRepository = container.adaptationEventRepository
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            guard let planId = try await planRepository.fetchActivePlan()?.id else {
                events = []
                return
            }
            events = try await adaptationEventRepository.fetchEvents(planId: planId)
                .sorted { $0.createdAt > $1.createdAt }
        } catch {
            errorMessage = "Impossible de charger l'historique : \(error.localizedDescription)"
        }
    }
}
