import SwiftUI

struct WorkoutRowView: View {
    let workout: Workout

    var body: some View {
        HStack(spacing: TCSpacing.sm) {
            ZStack {
                Circle()
                    .fill(TCColor.color(for: workout.sport).opacity(0.15))
                Image(systemName: workout.sport.systemImage)
                    .foregroundStyle(TCColor.color(for: workout.sport))
            }
            .frame(width: 40, height: 40)
            .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text(workout.title)
                    .font(TCFont.subheadline.weight(.semibold))
                    .foregroundStyle(statusColor)
                    .strikethrough(workout.status == .skipped)
                Text("\(workout.plannedDurationMin) min" + (workout.estimatedTSS.map { " · \(Int($0)) TSS" } ?? ""))
                    .font(TCFont.caption)
                    .foregroundStyle(TCColor.secondaryText)
            }

            Spacer()

            PillBadge(text: workout.intensity.label, tint: TCColor.color(for: workout.intensity))

            if workout.status == .completed {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                    .accessibilityLabel("Séance complétée")
            }
        }
        .padding(TCSpacing.sm)
        .background(TCColor.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: TCRadius.control, style: .continuous))
        .opacity(workout.status == .skipped ? 0.5 : 1)
        .accessibilityElement(children: .combine)
    }

    private var statusColor: Color {
        workout.status == .skipped ? TCColor.secondaryText : TCColor.primaryText
    }
}

#Preview {
    WorkoutRowView(workout: Workout(
        date: .now,
        sport: .run,
        title: "Fractionné VO2max",
        summary: "",
        structure: WorkoutStructure(
            warmup: WorkoutSection(durationMin: 10, description: "", target: TargetZone()),
            mainSet: [],
            cooldown: WorkoutSection(durationMin: 10, description: "", target: TargetZone())
        ),
        plannedDurationMin: 60,
        estimatedTSS: 85,
        intensity: .hard
    ))
    .padding()
}
