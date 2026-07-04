import SwiftUI

/// Shared goal-editing card used by both onboarding (`GoalsStepView`) and
/// the post-onboarding `GoalsManagementView` — one place to keep the
/// type/date/priority/target-time editing UI in sync.
struct GoalEditorCard: View {
    @Binding var goal: Goal
    var onDelete: (() -> Void)?

    @State private var hasTargetTime = false
    @State private var targetHours = 0
    @State private var targetMinutes = 0

    var body: some View {
        VStack(alignment: .leading, spacing: TCSpacing.sm) {
            HStack {
                Picker("Type d'objectif", selection: $goal.type) {
                    ForEach(GoalType.allCases) { type in
                        Text(type.label).tag(type)
                    }
                }
                if let onDelete {
                    Spacer()
                    Button(role: .destructive, action: onDelete) {
                        Image(systemName: "trash")
                    }
                    .accessibilityLabel("Supprimer cet objectif")
                }
            }

            DatePicker("Date cible", selection: $goal.targetDate, in: Date.now..., displayedComponents: .date)

            Picker("Priorité", selection: $goal.priority) {
                ForEach(GoalPriority.allCases) { priority in
                    Text(priority.label).tag(priority)
                }
            }
            .pickerStyle(.segmented)

            Toggle("Temps visé", isOn: $hasTargetTime)
            if hasTargetTime {
                HStack {
                    Stepper("\(targetHours) h", value: $targetHours, in: 0...15)
                    Stepper("\(targetMinutes) min", value: $targetMinutes, in: 0...59, step: 5)
                }
                .font(TCFont.caption)
                .onChange(of: targetHours) { updateTargetTime() }
                .onChange(of: targetMinutes) { updateTargetTime() }
            }
        }
        .padding(TCSpacing.sm)
        .background(TCColor.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: TCRadius.control, style: .continuous))
        .onAppear {
            if let seconds = goal.targetTimeSeconds {
                hasTargetTime = true
                targetHours = seconds / 3600
                targetMinutes = (seconds % 3600) / 60
            }
        }
        .onChange(of: hasTargetTime) { _, newValue in
            if !newValue { goal.targetTimeSeconds = nil } else { updateTargetTime() }
        }
    }

    private func updateTargetTime() {
        goal.targetTimeSeconds = targetHours * 3600 + targetMinutes * 60
    }
}
