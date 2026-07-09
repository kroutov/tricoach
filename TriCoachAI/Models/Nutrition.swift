import Foundation

enum MealType: String, Codable, CaseIterable, Identifiable, Hashable {
    case breakfast, lunch, dinner, snack
    var id: String { rawValue }

    var label: String {
        switch self {
        case .breakfast: return "Petit-déjeuner"
        case .lunch: return "Déjeuner"
        case .dinner: return "Dîner"
        case .snack: return "Snack"
        }
    }
}

enum DietaryTag: String, Codable, CaseIterable, Identifiable, Hashable {
    case vegetarian, chickenOnly, pescatarian, omnivore
    var id: String { rawValue }

    var label: String {
        switch self {
        case .vegetarian: return "Végétarien"
        case .chickenOnly: return "Poulet uniquement"
        case .pescatarian: return "Pescétarien"
        case .omnivore: return "Tout type d'ingrédient"
        }
    }
}

enum EffortProfile: String, Codable, CaseIterable, Identifiable, Hashable {
    case carbLoad, recovery, light, balanced
    var id: String { rawValue }

    var label: String {
        switch self {
        case .carbLoad: return "Riche en glucides"
        case .recovery: return "Récupération"
        case .light: return "Léger"
        case .balanced: return "Équilibré"
        }
    }
}

enum RecipeCategory: String, Codable, CaseIterable, Identifiable, Hashable {
    case dips, cookies, ovenBaked, stew, sandwich, dessert, toast, salad, pie, vegetarian, cake, pasta, soup
    var id: String { rawValue }

    var label: String {
        switch self {
        case .dips: return "Dips"
        case .cookies: return "Biscuits"
        case .ovenBaked: return "Plats au four"
        case .stew: return "Plats mijotés"
        case .sandwich: return "Sandwich"
        case .dessert: return "Desserts"
        case .toast: return "Tartines"
        case .salad: return "Salades"
        case .pie: return "Tartes"
        case .vegetarian: return "Végétarien"
        case .cake: return "Gâteaux"
        case .pasta: return "Pâtes"
        case .soup: return "Soupe"
        }
    }
}

enum PrepTimeBucket: String, Codable, CaseIterable, Identifiable, Hashable {
    case under15, min15to30, min30to45, min45to60, over60
    var id: String { rawValue }

    var label: String {
        switch self {
        case .under15: return "< 15 min"
        case .min15to30: return "15 - 30 min"
        case .min30to45: return "30 - 45 min"
        case .min45to60: return "45 - 60 min"
        case .over60: return "> 1 h"
        }
    }
}

enum GroceryAisle: String, Codable, CaseIterable, Identifiable, Hashable {
    case butcher, bakery, grocery, produce, fishmonger, fresh, frozen
    var id: String { rawValue }

    var label: String {
        switch self {
        case .butcher: return "Boucherie"
        case .bakery: return "Boulangerie"
        case .grocery: return "Épicerie"
        case .produce: return "Fruits et légumes"
        case .fishmonger: return "Poissonnerie"
        case .fresh: return "Rayon frais"
        case .frozen: return "Surgelé"
        }
    }
}

struct RecipeIngredient: Codable, Identifiable, Equatable, Hashable {
    let id: UUID
    let name: String
    let amount: Double?
    let unit: String?
    let aisle: GroceryAisle?
}

struct Recipe: Codable, Identifiable, Equatable, Hashable {
    let id: UUID
    let title: String
    let mealTypes: [MealType]
    let categories: [RecipeCategory]
    let dietaryTags: [DietaryTag]
    let effortProfile: EffortProfile
    let prepTime: PrepTimeBucket
    let servings: Int
    let instructions: String
    let ingredients: [RecipeIngredient]
}

struct SuggestedRecipesResponse: Codable {
    let effortProfile: EffortProfile
    let recipes: [Recipe]
}

struct MenuSelection: Codable, Identifiable, Equatable, Hashable {
    let id: UUID
    let date: Date
    let mealType: MealType
    let recipe: Recipe
}
