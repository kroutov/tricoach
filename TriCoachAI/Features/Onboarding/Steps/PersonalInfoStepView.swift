import SwiftUI

struct PersonalInfoStepView: View {
    @Binding var profile: AthleteProfile

    var body: some View {
        VStack(alignment: .leading, spacing: TCSpacing.lg) {
            Text("Parlez-nous de vous")
                .font(TCFont.title)

            OnboardingField(label: "Âge") {
                Stepper(value: Binding(get: { profile.age ?? 30 }, set: { profile.age = $0 }), in: 12...100) {
                    Text("\(profile.age ?? 30) ans")
                }
            }

            OnboardingField(label: "Sexe") {
                Picker("Sexe", selection: Binding(get: { profile.sex ?? .other }, set: { profile.sex = $0 })) {
                    ForEach(Sex.allCases) { sex in
                        Text(sex.label).tag(sex)
                    }
                }
                .pickerStyle(.segmented)
            }

            OnboardingField(label: "Taille (cm)") {
                Stepper(value: Binding(get: { profile.heightCm ?? 175 }, set: { profile.heightCm = $0 }), in: 120...230, step: 1) {
                    Text("\(Int(profile.heightCm ?? 175)) cm")
                }
            }

            OnboardingField(label: "Poids (kg)") {
                Stepper(value: Binding(get: { profile.weightKg ?? 70 }, set: { profile.weightKg = $0 }), in: 30...200, step: 0.5) {
                    Text(String(format: "%.1f kg", profile.weightKg ?? 70))
                }
            }
        }
    }
}

/// Shared label+control row used across every onboarding step.
struct OnboardingField<Content: View>: View {
    let label: String
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: TCSpacing.xs) {
            Text(label)
                .font(TCFont.subheadline)
                .foregroundStyle(TCColor.secondaryText)
            content
        }
        .padding(TCSpacing.sm)
        .background(TCColor.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: TCRadius.control, style: .continuous))
    }
}
