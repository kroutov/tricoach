import EventKit
import Foundation

enum CalendarSyncError: Error, LocalizedError {
    case accessDenied

    var errorDescription: String? {
        switch self {
        case .accessDenied:
            return "Accès au calendrier refusé. Activez-le dans Réglages > Drinking Sporting Coach > Calendriers."
        }
    }
}

/// Wraps EventKit so planned workouts can be mirrored into the user's
/// default Apple Calendar. Each `Workout` only carries a *date* (no time of
/// day) from the backend, so events default to the athlete's first
/// preferred time slot — see `defaultHour(for:)`.
@MainActor
final class CalendarSyncService {
    private let eventStore = EKEventStore()

    var authorizationStatus: EKAuthorizationStatus {
        EKEventStore.authorizationStatus(for: .event)
    }

    @discardableResult
    func requestAccess() async throws -> Bool {
        let granted = try await eventStore.requestFullAccessToEvents()
        guard granted else { throw CalendarSyncError.accessDenied }
        return granted
    }

    /// Creates or updates the calendar event mirroring `workout`, returning
    /// the EventKit identifier to persist back on the workout so future
    /// syncs update the same event instead of duplicating it.
    func syncEvent(for workout: Workout, defaultHour: Int) throws -> String {
        let event = existingEvent(identifier: workout.calendarEventId) ?? EKEvent(eventStore: eventStore)
        if event.calendar == nil {
            event.calendar = eventStore.defaultCalendarForNewEvents
        }
        apply(workout: workout, defaultHour: defaultHour, to: event)
        try eventStore.save(event, span: .thisEvent)
        return event.eventIdentifier
    }

    func removeEvent(identifier: String) {
        guard let event = existingEvent(identifier: identifier) else { return }
        try? eventStore.remove(event, span: .thisEvent)
    }

    /// Maps `Availability.preferredTimeSlots` to a default start hour.
    static func defaultHour(for timeSlots: Set<TimeSlot>) -> Int {
        let hours: [TimeSlot: Int] = [.earlyMorning: 6, .morning: 9, .lunch: 12, .afternoon: 15, .evening: 18]
        return timeSlots.compactMap { hours[$0] }.min() ?? 18
    }

    private func existingEvent(identifier: String?) -> EKEvent? {
        guard let identifier else { return nil }
        return eventStore.event(withIdentifier: identifier)
    }

    private func apply(workout: Workout, defaultHour: Int, to event: EKEvent) {
        event.title = workout.title
        event.notes = workout.summary
        let start = Calendar.current.date(bySettingHour: defaultHour, minute: 0, second: 0, of: workout.date) ?? workout.date
        event.startDate = start
        event.endDate = start.addingTimeInterval(TimeInterval(workout.plannedDurationMin * 60))
        event.alarms = [EKAlarm(relativeOffset: -30 * 60)]
    }
}
