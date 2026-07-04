import Foundation
import Observation

@MainActor
@Observable
final class CalendarViewModel {
    private(set) var plan: TrainingPlan?
    var selectedDate: Date = .now
    var conflictMessage: String?
    var rescheduleErrorMessage: String?

    private let planRepository: PlanRepository
    private let workoutAPI: WorkoutAPI

    init(container: DependencyContainer) {
        planRepository = container.planRepository
        workoutAPI = container.workoutAPI
    }

    func refresh() async {
        plan = try? await planRepository.fetchActivePlan()
    }

    /// Drag & drop rescheduling (plan §9 Phase 4 "drag & drop calendrier +
    /// détection de conflit"). The server enforces the hard constraint (stay
    /// within the workout's own training week) and reports back soft
    /// conflicts (rest day, another session already there) that don't block
    /// the move but are surfaced to the athlete.
    func reschedule(_ workout: Workout, to date: Date) async {
        rescheduleErrorMessage = nil
        do {
            let response = try await workoutAPI.reschedule(workoutId: workout.id, to: date)
            await refresh()
            if !response.conflicts.isEmpty {
                conflictMessage = response.conflicts.joined(separator: "\n")
            }
        } catch {
            rescheduleErrorMessage = "Impossible de déplacer la séance : \(error.localizedDescription)"
        }
    }

    var weekDates: [Date] {
        let calendar = Calendar.current
        guard let weekStart = calendar.dateInterval(of: .weekOfYear, for: selectedDate)?.start else { return [] }
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: weekStart) }
    }

    func workouts(on date: Date) -> [Workout] {
        plan?.workouts(on: date) ?? []
    }

    func microcycle(containing date: Date) -> Microcycle? {
        plan?.allMicrocycles.first { date >= $0.startDate && date <= $0.endDate }
    }

    var selectedDayWorkouts: [Workout] {
        workouts(on: selectedDate).sorted { $0.date < $1.date }
    }
}
