import Foundation
import Observation

@MainActor
@Observable
final class CalendarViewModel {
    private(set) var plan: TrainingPlan?
    var selectedDate: Date = .now
    var displayedMonth: Date = CalendarViewModel.startOfMonth(.now)
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

    /// Full weeks (Monday-first) spanning `displayedMonth` — 4 to 6 rows of
    /// 7 depending on the month, mirroring the web calendar's month grid.
    var monthGridDates: [Date] {
        let calendar = Calendar.current
        guard let monthInterval = calendar.dateInterval(of: .month, for: displayedMonth) else { return [] }

        // `.weekday` is 1=Sunday...7=Saturday regardless of the calendar's
        // configured first day of week — computed manually here so the grid
        // is always Monday-first, matching the web calendar and the app's
        // own `Weekday.orderedWeek` convention.
        let firstWeekday = calendar.component(.weekday, from: monthInterval.start)
        let mondayOffset = (firstWeekday + 5) % 7
        guard let gridStart = calendar.date(byAdding: .day, value: -mondayOffset, to: monthInterval.start) else { return [] }

        let lastDayOfMonth = calendar.date(byAdding: .day, value: -1, to: monthInterval.end) ?? monthInterval.start
        let lastWeekday = calendar.component(.weekday, from: lastDayOfMonth)
        let sundayOffset = (8 - lastWeekday) % 7
        guard let gridEnd = calendar.date(byAdding: .day, value: sundayOffset, to: lastDayOfMonth) else { return [] }

        var dates: [Date] = []
        var cursor = gridStart
        while cursor <= gridEnd {
            dates.append(cursor)
            guard let next = calendar.date(byAdding: .day, value: 1, to: cursor) else { break }
            cursor = next
        }
        return dates
    }

    var canGoToPreviousMonth: Bool {
        guard let planStart = plan?.startDate else { return true }
        return monthKey(displayedMonth) > monthKey(planStart)
    }

    var canGoToNextMonth: Bool {
        guard let planEnd = plan?.endDate else { return true }
        return monthKey(displayedMonth) < monthKey(planEnd)
    }

    func goToPreviousMonth() { shiftMonth(by: -1) }
    func goToNextMonth() { shiftMonth(by: 1) }

    func goToToday() {
        let today = Date.now
        selectedDate = today
        displayedMonth = Self.startOfMonth(today)
    }

    func selectDay(_ date: Date) {
        selectedDate = date
        if monthKey(date) != monthKey(displayedMonth) {
            displayedMonth = Self.startOfMonth(date)
        }
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

    private func shiftMonth(by deltaMonths: Int) {
        displayedMonth = Calendar.current.date(byAdding: .month, value: deltaMonths, to: displayedMonth) ?? displayedMonth
    }

    private func monthKey(_ date: Date) -> Int {
        let components = Calendar.current.dateComponents([.year, .month], from: date)
        return (components.year ?? 0) * 12 + (components.month ?? 0)
    }

    static func startOfMonth(_ date: Date) -> Date {
        let components = Calendar.current.dateComponents([.year, .month], from: date)
        return Calendar.current.date(from: components) ?? date
    }
}
