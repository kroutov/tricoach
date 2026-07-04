import Foundation
import Observation

@MainActor
@Observable
final class DashboardViewModel {
    private(set) var plan: TrainingPlan?
    private(set) var recentAdaptationEvents: [AdaptationEvent] = []

    private let planRepository: PlanRepository
    private let adaptationEventRepository: AdaptationEventRepository

    init(container: DependencyContainer) {
        planRepository = container.planRepository
        adaptationEventRepository = container.adaptationEventRepository
    }

    func refresh() async {
        plan = try? await planRepository.fetchActivePlan()
        if let planId = plan?.id {
            recentAdaptationEvents = Array(((try? await adaptationEventRepository.fetchEvents(planId: planId)) ?? []).prefix(5))
        }
    }

    var currentMicrocycle: Microcycle? {
        plan?.allMicrocycles.first { .now >= $0.startDate && .now <= $0.endDate }
    }

    var weekCompletionProgress: Double {
        guard let microcycle = currentMicrocycle, !microcycle.workouts.isEmpty else { return 0 }
        let completed = microcycle.workouts.filter { $0.status == .completed }.count
        return Double(completed) / Double(microcycle.workouts.count)
    }

    var weekCompletedLoad: Double {
        currentMicrocycle?.workouts.filter { $0.status == .completed }.reduce(0) { $0 + ($1.estimatedTSS ?? 0) } ?? 0
    }

    var weekPlannedLoad: Double {
        currentMicrocycle?.plannedLoad ?? 0
    }

    var upcomingWorkouts: [Workout] {
        guard let plan else { return [] }
        return plan.allWorkouts
            .filter { $0.date >= Calendar.current.startOfDay(for: .now) && $0.status == .planned }
            .sorted { $0.date < $1.date }
            .prefix(3)
            .map { $0 }
    }

    var currentPhaseLabel: String {
        guard let plan else { return "" }
        let phase = plan.macrocycles.first { .now >= $0.startDate && .now <= $0.endDate }?.phase
        return phase?.label ?? "—"
    }

    var weekNumberLabel: String {
        guard let microcycle = currentMicrocycle, let plan else { return "" }
        return "Semaine \(microcycle.weekNumber) / \(plan.durationWeeks)"
    }
}
