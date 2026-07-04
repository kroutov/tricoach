import Foundation
import Observation

@MainActor
@Observable
final class WorkoutDetailViewModel {
    private(set) var workout: Workout
    var actualDurationMin: Int
    var actualRPE: Int
    private(set) var lastAdaptationSummary: String?
    var errorMessage: String?
    var isSubmitting = false
    var rescheduleConflictMessage: String?

    private let workoutAPI: WorkoutAPI

    init(container: DependencyContainer, workout: Workout) {
        self.workout = workout
        actualDurationMin = workout.plannedDurationMin
        actualRPE = workout.rpeTarget ?? 5
        workoutAPI = container.workoutAPI
    }

    func markCompleted() async {
        await complete(status: .completed, actualDurationMin: actualDurationMin, rpe: actualRPE)
    }

    func markSkipped() async {
        await complete(status: .skipped, actualDurationMin: nil, rpe: nil)
    }

    /// Non-drag equivalent of the calendar's drag & drop rescheduling —
    /// the target date is only ever set from a `DatePicker`, so the same
    /// hard boundary (workout's own training week) and soft conflicts (rest
    /// day, day already occupied) are validated and reported server-side.
    func reschedule(to date: Date) async {
        errorMessage = nil
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            let response = try await workoutAPI.reschedule(workoutId: workout.id, to: date)
            workout = response.workout
            if !response.conflicts.isEmpty {
                rescheduleConflictMessage = response.conflicts.joined(separator: "\n")
            }
        } catch {
            errorMessage = "Impossible de déplacer la séance : \(error.localizedDescription)"
        }
    }

    /// The heavy lifting — comparing planned vs. realized and running the
    /// adaptation engine — now happens server-side (see
    /// `tricoach-backend/src/modules/workouts/routes.ts`); this just reflects
    /// the server's verdict back into the UI.
    private func complete(status: WorkoutStatus, actualDurationMin: Int?, rpe: Int?) async {
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }
        do {
            let response = try await workoutAPI.complete(workoutId: workout.id, status: status, actualDurationMin: actualDurationMin, rpe: rpe)
            workout = response.workout
            if !response.adaptationEvents.isEmpty {
                lastAdaptationSummary = response.adaptationEvents.map(\.actionTaken).joined(separator: "\n\n")
            }
        } catch {
            errorMessage = "Impossible d'enregistrer la séance : \(error.localizedDescription)"
        }
    }
}
