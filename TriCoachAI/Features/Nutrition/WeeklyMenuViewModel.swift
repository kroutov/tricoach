import Foundation
import Observation

@MainActor
@Observable
final class WeeklyMenuViewModel {
    private(set) var weekStart: Date
    var selections: [MenuSelection] = []
    var isLoading = false
    var errorMessage: String?

    private let nutritionAPI: NutritionAPI

    init(container: DependencyContainer) {
        nutritionAPI = container.nutritionAPI
        weekStart = Self.mondayOfWeek(.now)
    }

    /// The seven days of `weekStart`'s week, Monday-first — mirrors
    /// `CalendarViewModel.monthGridDates`'s Monday-first convention.
    var days: [Date] {
        (0..<7).compactMap { Calendar.current.date(byAdding: .day, value: $0, to: weekStart) }
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        guard let end = Calendar.current.date(byAdding: .day, value: 6, to: weekStart) else { return }
        do {
            selections = try await nutritionAPI.fetchMenuSelections(from: weekStart, to: end)
        } catch {
            errorMessage = "Impossible de charger le menu : \(error.localizedDescription)"
        }
    }

    func selection(for date: Date, mealType: MealType) -> MenuSelection? {
        selections.first { Calendar.current.isDate($0.date, inSameDayAs: date) && $0.mealType == mealType }
    }

    func goToPreviousWeek() { shiftWeek(by: -7) }
    func goToNextWeek() { shiftWeek(by: 7) }
    func goToToday() { weekStart = Self.mondayOfWeek(.now) }

    private func shiftWeek(by deltaDays: Int) {
        weekStart = Calendar.current.date(byAdding: .day, value: deltaDays, to: weekStart) ?? weekStart
    }

    func pick(_ recipe: Recipe, date: Date, mealType: MealType) async {
        errorMessage = nil
        do {
            _ = try await nutritionAPI.setMenuSelection(date: date, mealType: mealType, recipeId: recipe.id)
            await load()
        } catch {
            errorMessage = "Impossible d'enregistrer ce choix : \(error.localizedDescription)"
        }
    }

    func remove(date: Date, mealType: MealType) async {
        errorMessage = nil
        do {
            try await nutritionAPI.deleteMenuSelection(date: date, mealType: mealType)
            await load()
        } catch {
            errorMessage = "Impossible de retirer ce menu : \(error.localizedDescription)"
        }
    }

    /// `.weekday` is 1=Sunday...7=Saturday regardless of the calendar's
    /// configured first day of week — computed manually so the week is
    /// always Monday-first (matches `CalendarViewModel.monthGridDates`).
    static func mondayOfWeek(_ date: Date) -> Date {
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        let weekday = calendar.component(.weekday, from: startOfDay)
        let mondayOffset = (weekday + 5) % 7
        return calendar.date(byAdding: .day, value: -mondayOffset, to: startOfDay) ?? startOfDay
    }
}
