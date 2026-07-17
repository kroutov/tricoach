import SwiftUI

/// Single tab hosting both nutrition screens behind a segmented switch —
/// mirrors the web's two separate "Menu"/"Recettes" nav links without
/// spending two tab-bar slots on it.
struct NutritionHomeView: View {
    let container: DependencyContainer
    @State private var section: Section = .menu

    private enum Section: String, CaseIterable, Identifiable {
        case menu = "Menu", recipes = "Recettes", groceries = "Courses"
        var id: String { rawValue }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("", selection: $section) {
                    ForEach(Section.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, TCSpacing.md)
                .padding(.top, TCSpacing.xs)

                switch section {
                case .menu: WeeklyMenuView(container: container)
                case .recipes: RecipeCatalogView(container: container)
                case .groceries: GroceryListView(container: container)
                }
            }
        }
    }
}
