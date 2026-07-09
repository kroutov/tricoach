import Foundation

struct RecipeFilter {
    var mealType: MealType?
    var dietaryTag: DietaryTag?
    var category: RecipeCategory?
    var search: String?
}

/// `yyyy-MM-dd` in the *local* calendar — mirrors `WorkoutAPI`'s
/// `rescheduleDayFormatter` (see its comment): nutrition dates are stored as
/// UTC-midnight of their calendar day server-side, so a plain day string
/// sidesteps any risk of the day shifting across a timezone boundary.
private let nutritionDayFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.timeZone = .current
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
}()

private struct SetMenuSelectionRequest: Encodable {
    let recipeId: String
}

final class NutritionAPI {
    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    func fetchRecipes(filter: RecipeFilter = RecipeFilter()) async throws -> [Recipe] {
        var query: [String: String] = [:]
        if let mealType = filter.mealType { query["mealType"] = mealType.rawValue }
        if let dietaryTag = filter.dietaryTag { query["dietaryTag"] = dietaryTag.rawValue }
        if let category = filter.category { query["category"] = category.rawValue }
        if let search = filter.search, !search.isEmpty { query["search"] = search }
        return try await client.get("nutrition/recipes", query: query)
    }

    func fetchSuggestedRecipes(date: Date, mealType: MealType) async throws -> SuggestedRecipesResponse {
        try await client.get(
            "nutrition/recipes/suggested",
            query: ["date": nutritionDayFormatter.string(from: date), "mealType": mealType.rawValue]
        )
    }

    func fetchMenuSelections(from: Date, to: Date) async throws -> [MenuSelection] {
        try await client.get(
            "me/nutrition/menu",
            query: ["from": nutritionDayFormatter.string(from: from), "to": nutritionDayFormatter.string(from: to)]
        )
    }

    @discardableResult
    func setMenuSelection(date: Date, mealType: MealType, recipeId: UUID) async throws -> MenuSelection {
        let day = nutritionDayFormatter.string(from: date)
        return try await client.send(.put, "me/nutrition/menu/\(day)/\(mealType.rawValue)", body: SetMenuSelectionRequest(recipeId: recipeId.uuidString))
    }

    func deleteMenuSelection(date: Date, mealType: MealType) async throws {
        let day = nutritionDayFormatter.string(from: date)
        try await client.sendNoContent(.delete, "me/nutrition/menu/\(day)/\(mealType.rawValue)")
    }
}
