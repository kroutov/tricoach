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
    var isHealthKitConnected = false

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

    /// Requests authorization, then immediately pulls history and pushes it
    /// to the backend so a just-connected athlete's data feeds the plan
    /// right away.
    func connectHealthKit() async {
        isRequestingHealthKit = true
        healthKitError = nil
        defer { isRequestingHealthKit = false }
        do {
            try await healthKitManager.requestAuthorization()
            isHealthKitConnected = true
            healthKitStatus = "Synchronisation en cours…"
            try await pushHealthKitData()
        } catch {
            healthKitError = error.localizedDescription
        }
    }

    /// Re-pulls after the initial connect (new workouts since last time) —
    /// unlike Strava/Garmin this hits no external API and isn't rate
    /// limited, so it re-scans the same window rather than tracking a
    /// "last synced" cursor; the backend already dedupes by the workout's
    /// stable HealthKit UUID (`externalId`), so re-sending old activities
    /// is a no-op, not a duplicate.
    func syncHealthKit() async {
        isRequestingHealthKit = true
        healthKitError = nil
        defer { isRequestingHealthKit = false }
        do {
            try await pushHealthKitData()
        } catch {
            healthKitError = error.localizedDescription
        }
    }

    /// Unlike Strava/Garmin, HealthKit has no API rate limit to protect —
    /// it's a local on-device query — so there's no reason to cap this to a
    /// recent window the way the other sources are. Bounded to 2 years /
    /// 500 workouts rather than left fully unbounded so a first sync on an
    /// athlete with a decade of history doesn't turn into an enormous single
    /// payload.
    private func pushHealthKitData() async throws {
        let since = Calendar.current.date(byAdding: .year, value: -2, to: .now) ?? .distantPast
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
