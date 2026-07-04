import Foundation

struct WorkoutCompletionResponse: Codable {
    let workout: Workout
    let adaptationEvents: [AdaptationEvent]
}

private struct CompleteWorkoutRequest: Encodable {
    let status: String
    let actualDurationMin: Int?
    let rpe: Int?
}

private struct CalendarEventRequest: Encodable {
    let calendarEventId: String?
}

struct WorkoutRescheduleResponse: Codable {
    let workout: Workout
    let conflicts: [String]
}

private struct RescheduleRequest: Encodable {
    let date: String
}

/// `yyyy-MM-dd` in the *local* calendar — workout dates are stored as
/// UTC-midnight of their calendar day server-side (see the backend route),
/// so sending a full local-midnight instant here would let the day get
/// silently truncated to the wrong UTC day for any athlete east or west of
/// UTC. A plain day string sidesteps that entirely.
private let rescheduleDayFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.timeZone = .current
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
}()

/// Completing a session is a server-side action (it runs the adaptation
/// engine against the athlete's full recent history), not a plain CRUD
/// resource — hence a dedicated API type instead of a repository.
final class WorkoutAPI {
    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    func complete(workoutId: UUID, status: WorkoutStatus, actualDurationMin: Int?, rpe: Int?) async throws -> WorkoutCompletionResponse {
        try await client.send(
            .post,
            "workouts/\(workoutId.uuidString)/complete",
            body: CompleteWorkoutRequest(status: status.rawValue, actualDurationMin: actualDurationMin, rpe: rpe)
        )
    }

    @discardableResult
    func setCalendarEvent(workoutId: UUID, calendarEventId: String?) async throws -> Workout {
        try await client.send(.patch, "workouts/\(workoutId.uuidString)/calendar-event", body: CalendarEventRequest(calendarEventId: calendarEventId))
    }

    func reschedule(workoutId: UUID, to date: Date) async throws -> WorkoutRescheduleResponse {
        try await client.send(.patch, "workouts/\(workoutId.uuidString)", body: RescheduleRequest(date: rescheduleDayFormatter.string(from: date)))
    }
}
