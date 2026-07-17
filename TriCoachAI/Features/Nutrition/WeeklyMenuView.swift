import SwiftUI

private let dayHeaderFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateFormat = "EEEE d MMMM"
    return formatter
}()

private let weekRangeFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateFormat = "d MMMM"
    return formatter
}()

private struct MenuSlot: Identifiable {
    let date: Date
    let mealType: MealType
    var id: String { "\(date.timeIntervalSince1970)-\(mealType.rawValue)" }
}

struct WeeklyMenuView: View {
    let container: DependencyContainer
    @State private var viewModel: WeeklyMenuViewModel
    @State private var pendingSlot: MenuSlot?
    @State private var viewingSelection: MenuSelection?
    /// Set by "Changer" instead of presenting `pendingSlot` directly — two
    /// `.sheet(item:)` bindings on the same view can't both be satisfied in
    /// one update pass (UIKit only allows one active presentation), so
    /// requesting the suggestion sheet while the viewing sheet is still
    /// dismissing silently drops it. Deferring to `onDismiss` guarantees the
    /// first sheet has fully closed before the second one is requested.
    @State private var slotToOpenAfterDismiss: MenuSlot?

    init(container: DependencyContainer) {
        self.container = container
        _viewModel = State(initialValue: WeeklyMenuViewModel(container: container))
    }

    var body: some View {
        List {
            if viewModel.proposedCount > 0 {
                Section {
                    HStack {
                        Text("\(viewModel.proposedCount) recette\(viewModel.proposedCount > 1 ? "s" : "") proposée\(viewModel.proposedCount > 1 ? "s" : "") — à valider")
                            .font(TCFont.caption)
                            .foregroundStyle(TCColor.primaryText)
                        Spacer()
                        Button("Tout valider") {
                            Task { await viewModel.confirmWeek() }
                        }
                        .font(TCFont.caption.weight(.semibold))
                    }
                }
            }

            ForEach(viewModel.days, id: \.self) { day in
                Section(dayHeaderFormatter.string(from: day).capitalized) {
                    ForEach(MealType.allCases) { mealType in
                        row(for: day, mealType: mealType)
                    }
                }
            }

            if let error = viewModel.errorMessage {
                Text(error).font(TCFont.caption).foregroundStyle(.red)
            }
        }
        .navigationTitle("Menu de la semaine")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    viewModel.goToPreviousWeek()
                    Task { await viewModel.load() }
                } label: {
                    Image(systemName: "chevron.left")
                }
                .accessibilityLabel("Semaine précédente")
            }
            ToolbarItem(placement: .principal) {
                Button("Aujourd'hui") {
                    viewModel.goToToday()
                    Task { await viewModel.load() }
                }
                .font(TCFont.caption)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    viewModel.goToNextWeek()
                    Task { await viewModel.load() }
                } label: {
                    Image(systemName: "chevron.right")
                }
                .accessibilityLabel("Semaine suivante")
            }
        }
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
        .sheet(item: $pendingSlot) { slot in
            SuggestionSheet(container: container, date: slot.date, mealType: slot.mealType) { recipe in
                Task {
                    await viewModel.pick(recipe, date: slot.date, mealType: slot.mealType)
                    pendingSlot = nil
                }
            }
        }
        .sheet(item: $viewingSelection, onDismiss: {
            if let slot = slotToOpenAfterDismiss {
                slotToOpenAfterDismiss = nil
                pendingSlot = slot
            }
        }) { selection in
            ViewingSlotSheet(
                selection: selection,
                onValidate: selection.status == .proposed ? {
                    Task {
                        await viewModel.pick(selection.recipe, date: selection.date, mealType: selection.mealType)
                        viewingSelection = nil
                    }
                } : nil,
                onChange: {
                    slotToOpenAfterDismiss = MenuSlot(date: selection.date, mealType: selection.mealType)
                    viewingSelection = nil
                },
                onRemove: {
                    Task {
                        await viewModel.remove(date: selection.date, mealType: selection.mealType)
                        viewingSelection = nil
                    }
                }
            )
        }
    }

    @ViewBuilder
    private func row(for day: Date, mealType: MealType) -> some View {
        if let selection = viewModel.selection(for: day, mealType: mealType) {
            Button {
                viewingSelection = selection
            } label: {
                HStack {
                    Text(mealType.label).foregroundStyle(TCColor.secondaryText)
                    Spacer()
                    VStack(alignment: .trailing, spacing: TCSpacing.xs) {
                        Text(selection.recipe.title).foregroundStyle(TCColor.primaryText)
                        HStack(spacing: TCSpacing.xs) {
                            if selection.status == .proposed {
                                PillBadge(text: MenuSelectionStatus.proposed.label, tint: TCColor.brand)
                            }
                            PillBadge(text: selection.recipe.effortProfile.label, tint: TCColor.color(for: selection.recipe.effortProfile))
                        }
                    }
                }
            }
        } else {
            Button {
                pendingSlot = MenuSlot(date: day, mealType: mealType)
            } label: {
                HStack {
                    Text(mealType.label).foregroundStyle(TCColor.secondaryText)
                    Spacer()
                    Image(systemName: "plus.circle").foregroundStyle(TCColor.brand)
                }
            }
            .accessibilityLabel("Choisir un menu pour \(mealType.label) du \(dayHeaderFormatter.string(from: day))")
        }
    }
}

private struct SuggestionSheet: View {
    let container: DependencyContainer
    let date: Date
    let mealType: MealType
    var onPick: (Recipe) -> Void

    @State private var response: SuggestedRecipesResponse?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if let response {
                    List {
                        Section {
                            HStack {
                                Text("Profil d'effort du jour")
                                Spacer()
                                PillBadge(text: response.effortProfile.label, tint: TCColor.color(for: response.effortProfile))
                            }
                        }
                        Section {
                            if response.recipes.isEmpty {
                                Text("Aucune suggestion pour ce créneau.").foregroundStyle(TCColor.secondaryText)
                            } else {
                                ForEach(response.recipes) { recipe in
                                    Button {
                                        onPick(recipe)
                                    } label: {
                                        HStack {
                                            Text(recipe.title).foregroundStyle(TCColor.primaryText)
                                            Spacer()
                                            PillBadge(text: recipe.effortProfile.label, tint: TCColor.color(for: recipe.effortProfile))
                                        }
                                    }
                                }
                            }
                        }
                        Section {
                            NavigationLink("Voir tout le catalogue") {
                                RecipeCatalogView(container: container)
                            }
                        }
                    }
                } else {
                    ContentUnavailableView("Erreur", systemImage: "exclamationmark.triangle", description: Text(errorMessage ?? ""))
                }
            }
            .navigationTitle(mealType.label)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
            .task {
                do {
                    response = try await container.nutritionAPI.fetchSuggestedRecipes(date: date, mealType: mealType)
                } catch {
                    errorMessage = error.localizedDescription
                }
                isLoading = false
            }
        }
    }
}

private struct ViewingSlotSheet: View {
    let selection: MenuSelection
    var onValidate: (() -> Void)?
    var onChange: () -> Void
    var onRemove: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                RecipeDetailSections(recipe: selection.recipe)

                Section {
                    if let onValidate {
                        Button("Valider", action: onValidate)
                    }
                    Button("Changer", action: onChange)
                    Button("Retirer", role: .destructive, action: onRemove)
                }
            }
            .navigationTitle(selection.recipe.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
    }
}
