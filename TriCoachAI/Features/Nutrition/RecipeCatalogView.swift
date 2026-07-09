import SwiftUI

struct RecipeCatalogView: View {
    let container: DependencyContainer
    @State private var viewModel: RecipeCatalogViewModel

    init(container: DependencyContainer) {
        self.container = container
        _viewModel = State(initialValue: RecipeCatalogViewModel(container: container))
    }

    var body: some View {
        List {
            if viewModel.recipes.isEmpty && !viewModel.isLoading {
                ContentUnavailableView("Aucune recette", systemImage: "fork.knife", description: Text("Aucune recette ne correspond à ces filtres."))
            } else {
                ForEach(viewModel.recipes) { recipe in
                    NavigationLink(value: recipe) {
                        VStack(alignment: .leading, spacing: TCSpacing.xs) {
                            Text(recipe.title).font(TCFont.headline)
                            HStack {
                                PillBadge(text: recipe.effortProfile.label, tint: TCColor.color(for: recipe.effortProfile))
                                PillBadge(text: recipe.prepTime.label, tint: TCColor.secondaryText)
                            }
                            Text(recipe.categories.map(\.label).joined(separator: ", "))
                                .font(TCFont.caption)
                                .foregroundStyle(TCColor.secondaryText)
                        }
                    }
                }
            }

            if let error = viewModel.errorMessage {
                Text(error).font(TCFont.caption).foregroundStyle(.red)
            }
        }
        .navigationTitle("Recettes")
        .navigationDestination(for: Recipe.self) { recipe in
            RecipeDetailView(recipe: recipe)
        }
        .searchable(text: $viewModel.search, prompt: "Rechercher une recette…")
        .onSubmit(of: .search) { Task { await viewModel.load() } }
        .onChange(of: viewModel.search) { _, newValue in
            if newValue.isEmpty { Task { await viewModel.load() } }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Picker("Repas", selection: $viewModel.mealType) {
                        Text("Tous les repas").tag(MealType?.none)
                        ForEach(MealType.allCases) { Text($0.label).tag(MealType?.some($0)) }
                    }
                    Picker("Régime", selection: $viewModel.dietaryTag) {
                        Text("Tous les régimes").tag(DietaryTag?.none)
                        ForEach(DietaryTag.allCases) { Text($0.label).tag(DietaryTag?.some($0)) }
                    }
                    Picker("Catégorie", selection: $viewModel.category) {
                        Text("Toutes les catégories").tag(RecipeCategory?.none)
                        ForEach(RecipeCategory.allCases) { Text($0.label).tag(RecipeCategory?.some($0)) }
                    }
                } label: {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                }
                .accessibilityLabel("Filtrer les recettes")
            }
        }
        .onChange(of: viewModel.mealType) { _, _ in Task { await viewModel.load() } }
        .onChange(of: viewModel.dietaryTag) { _, _ in Task { await viewModel.load() } }
        .onChange(of: viewModel.category) { _, _ in Task { await viewModel.load() } }
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
    }
}

struct RecipeDetailView: View {
    let recipe: Recipe

    var body: some View {
        List {
            RecipeDetailSections(recipe: recipe)
        }
        .navigationTitle(recipe.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

/// The read-only ingredients/instructions content shared by `RecipeDetailView`
/// (catalog) and `ViewingSlotSheet` (weekly menu) — so picking a recipe for a
/// meal slot doesn't require a separate trip to the catalog to see the steps.
struct RecipeDetailSections: View {
    let recipe: Recipe

    var body: some View {
        Section {
            HStack {
                PillBadge(text: recipe.effortProfile.label, tint: TCColor.color(for: recipe.effortProfile))
                PillBadge(text: recipe.prepTime.label, tint: TCColor.secondaryText)
                PillBadge(text: "\(recipe.servings) pers.", tint: TCColor.secondaryText)
            }
        }

        Section("Ingrédients") {
            ForEach(recipe.ingredients) { ingredient in
                HStack {
                    Text(ingredient.name)
                    Spacer()
                    if let amount = ingredient.amount {
                        Text("\(amount.formatted())\(ingredient.unit.map { " \($0)" } ?? "")")
                            .foregroundStyle(TCColor.secondaryText)
                    }
                }
            }
        }

        Section("Préparation") {
            Text(recipe.instructions)
        }
    }
}
