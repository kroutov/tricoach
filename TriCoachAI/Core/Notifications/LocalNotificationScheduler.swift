import Foundation
import UserNotifications

enum NotificationError: Error, LocalizedError {
    case denied

    var errorDescription: String? {
        "Notifications refusées. Activez-les dans Réglages > Drinking Sporting Coach > Notifications."
    }
}

/// Local reminders only (no APNs certificate/Apple Developer Team available
/// in this environment — see plan §9 Phase 3/5 notes). Covers the "rappels"
/// half of the spec's push requirement; remote "alertes d'adaptation
/// serveur-push" would reuse this same content once APNs is wired up.
final class LocalNotificationScheduler {
    private let center = UNUserNotificationCenter.current()

    @discardableResult
    func requestAuthorization() async throws -> Bool {
        let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
        guard granted else { throw NotificationError.denied }
        return granted
    }

    /// Schedules a reminder `hoursBefore` each upcoming planned workout,
    /// assuming it happens at `defaultHour` (workouts only carry a date, not
    /// a time — same convention as `CalendarSyncService`). Clears
    /// previously scheduled workout reminders first so re-syncing after a
    /// plan change doesn't leave stale/duplicate notifications.
    func scheduleWorkoutReminders(for workouts: [Workout], defaultHour: Int, hoursBefore: Int = 2) async -> Int {
        let pending = await center.pendingNotificationRequests()
        let workoutReminderIds = pending.map(\.identifier).filter { $0.hasPrefix("workout-") }
        center.removePendingNotificationRequests(withIdentifiers: workoutReminderIds)

        var scheduledCount = 0
        for workout in workouts where workout.status == .planned {
            guard let sessionTime = Calendar.current.date(bySettingHour: defaultHour, minute: 0, second: 0, of: workout.date),
                  let triggerDate = Calendar.current.date(byAdding: .hour, value: -hoursBefore, to: sessionTime),
                  triggerDate > .now
            else { continue }

            let content = UNMutableNotificationContent()
            content.title = workout.title
            content.body = "\(workout.plannedDurationMin) min · \(workout.intensity.label)"
            content.sound = .default

            let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: triggerDate)
            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            let request = UNNotificationRequest(identifier: "workout-\(workout.id.uuidString)", content: content, trigger: trigger)
            try? await center.add(request)
            scheduledCount += 1
        }
        return scheduledCount
    }

    /// Fires right away — used when the server returns adaptation events
    /// from a workout completion or sync, so the athlete notices even if
    /// they've backgrounded the app.
    func notifyAdaptation(_ events: [AdaptationEvent]) async {
        guard let event = events.first else { return }
        let content = UNMutableNotificationContent()
        content.title = "Votre plan a été ajusté"
        content.body = event.actionTaken
        content.sound = .default
        let request = UNNotificationRequest(identifier: "adaptation-\(event.id.uuidString)", content: content, trigger: nil)
        try? await center.add(request)
    }
}
