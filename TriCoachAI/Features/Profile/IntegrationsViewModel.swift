import Foundation
import Observation

@MainActor
@Observable
final class IntegrationsViewModel {
    var calendarSyncStatus: String = "Non synchronisé"
    var isSyncingCalendar = false
    var calendarError: String?

    var healthKitStatus: String = "Non connecté"
    var isRequestingHealthKit = false
    var healthKitError: String?

    var isStravaConnected = false
    var stravaStatus: String = "Non connecté"
    var isConnectingStrava = false
    var stravaError: String?

    var reminderStatus: String = "Désactivés"
    var isSchedulingReminders = false
    var reminderError: String?

    private let calendarService = CalendarSyncService()
    private let notificationScheduler = LocalNotificationScheduler()
    private let healthKitManager = HealthKitManager()
    private let healthKitProvider: HealthKitProvider
    private let stravaAuthSession = StravaAuthSession()
    private let planRepository: PlanRepository
    private let profileRepository: ProfileRepository
    private let workoutAPI: WorkoutAPI
    private let stravaAPI: StravaAPI
    private let healthKitSyncAPI: HealthKitSyncAPI

    init(container: DependencyContainer) {
        planRepository = container.planRepository
        profileRepository = container.profileRepository
        workoutAPI = container.workoutAPI
        stravaAPI = container.stravaAPI
        healthKitSyncAPI = container.healthKitSyncAPI
        healthKitProvider = HealthKitProvider(manager: healthKitManager)
    }

    func loadStatuses() async {
        if let status = try? await stravaAPI.status() {
            isStravaConnected = status.connected
            stravaStatus = status.connected ? "Connecté" : "Non connecté"
        }
    }

    // MARK: - Calendar (EventKit)

    /// Mirrors every not-yet-completed upcoming workout of the active plan
    /// into the user's default Apple Calendar, reusing the stored
    /// `calendarEventId` on repeat syncs so events update instead of duplicating.
    func syncCalendar() async {
        isSyncingCalendar = true
        calendarError = nil
        defer { isSyncingCalendar = false }

        do {
            try await calendarService.requestAccess()
            guard let plan = try await planRepository.fetchActivePlan() else {
                calendarError = "Aucun plan actif à synchroniser."
                return
            }
            let availability = try await profileRepository.loadAvailability()
            let defaultHour = CalendarSyncService.defaultHour(for: availability.preferredTimeSlots)

            let today = Calendar.current.startOfDay(for: .now)
            let upcoming = plan.allWorkouts.filter { $0.date >= today && $0.status == .planned }

            var syncedCount = 0
            for workout in upcoming {
                let eventId = try calendarService.syncEvent(for: workout, defaultHour: defaultHour)
                if workout.calendarEventId != eventId {
                    try? await workoutAPI.setCalendarEvent(workoutId: workout.id, calendarEventId: eventId)
                }
                syncedCount += 1
            }
            calendarSyncStatus = syncedCount > 0 ? "\(syncedCount) séances synchronisées" : "Aucune séance à venir"
        } catch {
            calendarError = error.localizedDescription
        }
    }

    // MARK: - Reminders (local notifications)

    func enableReminders() async {
        isSchedulingReminders = true
        reminderError = nil
        defer { isSchedulingReminders = false }
        do {
            try await notificationScheduler.requestAuthorization()
            guard let plan = try await planRepository.fetchActivePlan() else {
                reminderStatus = "Aucun plan actif"
                return
            }
            let availability = try await profileRepository.loadAvailability()
            let defaultHour = CalendarSyncService.defaultHour(for: availability.preferredTimeSlots)
            let today = Calendar.current.startOfDay(for: .now)
            let upcoming = plan.allWorkouts.filter { $0.date >= today }
            let count = await notificationScheduler.scheduleWorkoutReminders(for: upcoming, defaultHour: defaultHour)
            reminderStatus = count > 0 ? "\(count) rappels programmés" : "Aucune séance à venir"
        } catch {
            reminderError = error.localizedDescription
        }
    }

    // MARK: - HealthKit

    /// Requests authorization, then immediately pulls the last 30 days of
    /// workouts/health metrics and pushes them to the backend so a
    /// just-connected athlete's history feeds the plan right away.
    func connectHealthKit() async {
        isRequestingHealthKit = true
        healthKitError = nil
        defer { isRequestingHealthKit = false }
        do {
            try await healthKitManager.requestAuthorization()
            healthKitStatus = "Synchronisation en cours…"
            try await pushHealthKitData()
        } catch {
            healthKitError = error.localizedDescription
        }
    }

    private func pushHealthKitData() async throws {
        let since = Calendar.current.date(byAdding: .day, value: -30, to: .now) ?? .now
        let activities = try await healthKitProvider.fetchRecentActivities(since: since)
        let metrics = try await healthKitProvider.fetchRecentHealthMetrics(since: since)
        let response = try await healthKitSyncAPI.sync(activities: activities, healthMetrics: metrics)
        healthKitStatus = "\(response.activitiesIngested) séances synchronisées"
        await notificationScheduler.notifyAdaptation(response.adaptationEvents)
    }

    // MARK: - Strava

    func connectStrava() async {
        isConnectingStrava = true
        stravaError = nil
        defer { isConnectingStrava = false }
        do {
            let authURL = try await stravaAPI.authURL()
            try await stravaAuthSession.connect(authorizeURL: authURL)
            isStravaConnected = true
            stravaStatus = "Connecté — synchronisation…"
            let sync = try await stravaAPI.sync()
            stravaStatus = "\(sync.activitiesIngested) séances synchronisées"
            await notificationScheduler.notifyAdaptation(sync.adaptationEvents)
        } catch {
            stravaError = error.localizedDescription
        }
    }

    func disconnectStrava() async {
        do {
            try await stravaAPI.disconnect()
            isStravaConnected = false
            stravaStatus = "Non connecté"
        } catch {
            stravaError = error.localizedDescription
        }
    }
}
