import SwiftUI

struct GoalsStepView: View {
    var viewModel: OnboardingViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: TCSpacing.md) {
            Text("Vos objectifs")
                .font(TCFont.title)
            Text("Vous pouvez viser plusieurs courses ; la priorité A détermine le plan généré.")
                .font(TCFont.caption)
                .foregroundStyle(TCColor.secondaryText)

            ForEach(Array(viewModel.goals.enumerated()), id: \.element.id) { index, _ in
                GoalEditorCard(
                    goal: Binding(
                        get: { viewModel.goals[index] },
                        set: { viewModel.goals[index] = $0 }
                    ),
                    onDelete: viewModel.goals.count > 1 ? { viewModel.goals.remove(at: index) } : nil
                )
            }

            Button {
                viewModel.addGoal()
            } label: {
                Label("Ajouter un objectif", systemImage: "plus.circle.fill")
            }
            .padding(.top, TCSpacing.xs)
        }
    }
}
