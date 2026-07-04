import SwiftUI

struct GoalsManagementView: View {
    let container: DependencyContainer
    @State private var viewModel: GoalsManagementViewModel
    @State private var editingGoal: Goal?

    init(container: DependencyContainer) {
        self.container = container
        _viewModel = State(initialValue: GoalsManagementViewModel(container: container))
    }

    var body: some View {
        List {
            Section {
                if viewModel.goals.isEmpty && !viewModel.isLoading {
                    ContentUnavailableView("Aucun objectif", systemImage: "flag", description: Text("Ajoutez votre première course cible."))
                } else {
                    ForEach(viewModel.goals) { goal in
                        Button {
                            editingGoal = goal
                        } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                HStack {
                                    Text(goal.type.label).font(TCFont.headline)
                                    Spacer()
                                    PillBadge(text: goal.priority.label, tint: TCColor.brand)
                                }
                                Text(goal.targetDate.formatted(date: .long, time: .omitted))
                                    .font(TCFont.caption)
                                    .foregroundStyle(TCColor.secondaryText)
                            }
                        }
                        .foregroundStyle(TCColor.primaryText)
                        .accessibilityHint("Ouvre les détails de cet objectif pour le modifier")
                    }
                }
            }

            Section {
                Button {
                    editingGoal = Goal(
                        type: .run10k,
                        targetDate: Calendar.current.date(byAdding: .weekOfYear, value: 8, to: .now) ?? .now,
                        priority: .b
                    )
                } label: {
                    Label("Ajouter un objectif", systemImage: "plus.circle.fill")
                }
            }

            Section {
                Button {
                    Task { await viewModel.regeneratePlan() }
                } label: {
                    if viewModel.isRegenerating {
                        ProgressView()
                    } else {
                        Text("Régénérer mon plan")
                    }
                }
                .disabled(viewModel.goals.isEmpty || viewModel.isRegenerating)

                if let message = viewModel.regenerationMessage {
                    Text(message).font(TCFont.caption).foregroundStyle(.green)
                }
                if let error = viewModel.errorMessage {
                    Text(error).font(TCFont.caption).foregroundStyle(.red)
                }
            } footer: {
                Text("Le plan est régénéré à partir de l'objectif de priorité A (ou du premier objectif si aucun n'est prioritaire). Le plan actuel est archivé, pas supprimé.")
            }
        }
        .navigationTitle("Objectifs")
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
        .sheet(item: $editingGoal) { goal in
            GoalEditSheet(
                goal: goal,
                isNew: !viewModel.isKnown(goal),
                onSave: { updated in
                    Task {
                        await viewModel.save(updated)
                        editingGoal = nil
                    }
                },
                onDelete: viewModel.isKnown(goal) ? {
                    Task {
                        await viewModel.delete(goal)
                        editingGoal = nil
                    }
                } : nil,
                onCancel: { editingGoal = nil }
            )
        }
    }
}

private struct GoalEditSheet: View {
    @State var goal: Goal
    let isNew: Bool
    var onSave: (Goal) -> Void
    var onDelete: (() -> Void)?
    var onCancel: () -> Void

    var body: some View {
        NavigationStack {
            Form {
                GoalEditorCard(goal: $goal, onDelete: nil)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)

                if !isNew, let onDelete {
                    Section {
                        Button("Supprimer cet objectif", role: .destructive, action: onDelete)
                    }
                }
            }
            .navigationTitle(isNew ? "Nouvel objectif" : "Modifier l'objectif")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler", action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Enregistrer") { onSave(goal) }
                }
            }
        }
    }
}
