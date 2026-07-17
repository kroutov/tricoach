import SwiftUI

private let weekRangeFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateFormat = "d MMMM"
    return formatter
}()

struct GroceryListView: View {
    let container: DependencyContainer
    @State private var viewModel: GroceryListViewModel

    init(container: DependencyContainer) {
        self.container = container
        _viewModel = State(initialValue: GroceryListViewModel(container: container))
    }

    var body: some View {
        Group {
            if viewModel.aisles.isEmpty && !viewModel.isLoading {
                ContentUnavailableView("Aucune recette sélectionnée cette semaine.", systemImage: "cart")
            } else {
                List {
                    ForEach(viewModel.aisles) { group in
                        Section(group.aisle?.label ?? "Autres") {
                            ForEach(group.items) { item in
                                Text(itemLabel(item))
                                    .foregroundStyle(TCColor.primaryText)
                            }
                        }
                    }

                    if let error = viewModel.errorMessage {
                        Text(error).font(TCFont.caption).foregroundStyle(.red)
                    }
                }
            }
        }
        .navigationTitle("Liste de courses")
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
                VStack(spacing: 2) {
                    if let first = viewModel.days.first, let last = viewModel.days.last {
                        Text("\(weekRangeFormatter.string(from: first)) – \(weekRangeFormatter.string(from: last))")
                            .font(TCFont.caption)
                    }
                    Button("Aujourd'hui") {
                        viewModel.goToToday()
                        Task { await viewModel.load() }
                    }
                    .font(TCFont.caption)
                }
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
    }

    private func itemLabel(_ item: ShoppingListItem) -> String {
        guard let amount = item.amount else { return item.name }
        return "\(item.name) — \(amount.formatted())\(item.unit.map { " \($0)" } ?? "")"
    }
}
