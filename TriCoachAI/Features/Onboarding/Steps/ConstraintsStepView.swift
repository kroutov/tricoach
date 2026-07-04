import SwiftUI

struct ConstraintsStepView: View {
    @Binding var checkIn: ConstraintCheckIn
    @State private var newInjury = ""

    var body: some View {
        VStack(alignment: .leading, spacing: TCSpacing.lg) {
            Text("Contraintes actuelles")
                .font(TCFont.title)
            Text("Ces informations permettent au moteur d'adaptation de rester prudent dès la première semaine.")
                .font(TCFont.caption)
                .foregroundStyle(TCColor.secondaryText)

            OnboardingField(label: "Blessures éventuelles") {
                VStack(alignment: .leading, spacing: TCSpacing.xs) {
                    ForEach(checkIn.injuries, id: \.self) { injury in
                        HStack {
                            Text(injury)
                            Spacer()
                            Button(role: .destructive) {
                                checkIn.injuries.removeAll { $0 == injury }
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.secondary)
                            }
                            .accessibilityLabel("Supprimer cette blessure : \(injury)")
                        }
                    }
                    HStack {
                        TextField("Ex : douleur genou droit", text: $newInjury)
                            .textFieldStyle(.roundedBorder)
                        Button("Ajouter") {
                            guard !newInjury.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                            checkIn.injuries.append(newInjury)
                            newInjury = ""
                        }
                    }
                }
            }

            OnboardingField(label: "Niveau de fatigue (1 = très frais, 5 = épuisé)") {
                Stepper(value: $checkIn.fatigueLevel, in: 1...5) {
                    Text("\(checkIn.fatigueLevel) / 5")
                }
            }

            OnboardingField(label: "Niveau de stress (1 = détendu, 5 = très stressé)") {
                Stepper(value: $checkIn.stressLevel, in: 1...5) {
                    Text("\(checkIn.stressLevel) / 5")
                }
            }

            OnboardingField(label: "Sommeil moyen") {
                Stepper(value: $checkIn.sleepHours, in: 3...11, step: 0.5) {
                    Text(String(format: "%.1f h / nuit", checkIn.sleepHours))
                }
            }
        }
    }
}
