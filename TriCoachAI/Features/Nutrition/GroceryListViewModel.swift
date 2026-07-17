import Foundation
import Observation

@MainActor
@Observable
final class GroceryListViewModel {
    private(set) var weekStart: Date
    var aisles: [ShoppingListAisleGroup] = []
    var isLoading = false
    var errorMessage: String?

    private let nutritionAPI: NutritionAPI

    init(container: DependencyContainer) {
        nutritionAPI = container.nutritionAPI
        weekStart = WeeklyMenuViewModel.mondayOfWeek(.now)
    }

    var days: [Date] {
        (0..<7).compactMap { Calendar.current.date(byAdding: .day, value: $0, to: weekStart) }
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        guard let end = Calendar.current.date(byAdding: .day, value: 6, to: weekStart) else { return }
        do {
            aisles = try await nutritionAPI.fetchShoppingList(from: weekStart, to: end).aisles
        } catch {
            errorMessage = "Impossible de charger la liste de courses : \(error.localizedDescription)"
        }
    }

    func goToPreviousWeek() { shiftWeek(by: -7) }
    func goToNextWeek() { shiftWeek(by: 7) }
    func goToToday() { weekStart = WeeklyMenuViewModel.mondayOfWeek(.now) }

    private func shiftWeek(by deltaDays: Int) {
        weekStart = Calendar.current.date(byAdding: .day, value: deltaDays, to: weekStart) ?? weekStart
    }
}
