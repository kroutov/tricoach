import Foundation
import Observation

@MainActor
@Observable
final class RecipeCatalogViewModel {
    var recipes: [Recipe] = []
    var isLoading = false
    var errorMessage: String?

    var search = ""
    var mealType: MealType?
    var dietaryTag: DietaryTag?
    var category: RecipeCategory?

    private let nutritionAPI: NutritionAPI

    init(container: DependencyContainer) {
        nutritionAPI = container.nutritionAPI
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let filter = RecipeFilter(mealType: mealType, dietaryTag: dietaryTag, category: category, search: search.isEmpty ? nil : search)
            recipes = try await nutritionAPI.fetchRecipes(filter: filter)
        } catch {
            errorMessage = "Impossible de charger les recettes : \(error.localizedDescription)"
        }
    }
}
