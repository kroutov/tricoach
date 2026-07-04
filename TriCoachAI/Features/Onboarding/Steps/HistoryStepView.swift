import SwiftUI

struct HistoryStepView: View {
    @Binding var profile: AthleteProfile

    var body: some View {
        VStack(alignment: .leading, spacing: TCSpacing.lg) {
            Text("Votre historique")
                .font(TCFont.title)
            Text("Ces données personnalisent vos zones d'entraînement. Laissez vide si inconnu — vous pourrez les compléter plus tard.")
                .font(TCFont.caption)
                .foregroundStyle(TCColor.secondaryText)

            OnboardingField(label: "Années de pratique") {
                Stepper(value: Binding(get: { profile.yearsPractice ?? 1 }, set: { profile.yearsPractice = $0 }), in: 0...40, step: 0.5) {
                    Text(String(format: "%.1f ans", profile.yearsPractice ?? 1))
                }
            }

            OnboardingField(label: "Volume hebdomadaire moyen") {
                Stepper(value: Binding(get: { profile.weeklyVolumeAvgMin ?? 180 }, set: { profile.weeklyVolumeAvgMin = $0 }), in: 0...1200, step: 15) {
                    Text("\(profile.weeklyVolumeAvgMin ?? 180) min / semaine")
                }
            }

            OnboardingField(label: "Fréquence cardiaque max (bpm)") {
                Stepper(value: Binding(get: { profile.hrMax ?? 185 }, set: { profile.hrMax = $0 }), in: 120...230) {
                    Text("\(profile.hrMax ?? 185) bpm")
                }
            }

            OnboardingField(label: "Fréquence cardiaque au repos (bpm)") {
                Stepper(value: Binding(get: { profile.hrRest ?? 55 }, set: { profile.hrRest = $0 }), in: 30...100) {
                    Text("\(profile.hrRest ?? 55) bpm")
                }
            }

            OnboardingField(label: "FTP vélo (watts, si connu)") {
                Stepper(value: Binding(get: { profile.ftpWatts ?? 200 }, set: { profile.ftpWatts = $0 }), in: 0...500, step: 5) {
                    Text(profile.ftpWatts != nil ? "\(profile.ftpWatts!) W" : "Non renseigné")
                }
            }

            OnboardingField(label: "Allure seuil course (min/km, si connue)") {
                Stepper(value: Binding(get: { profile.thresholdPaceSecPerKm ?? 300 }, set: { profile.thresholdPaceSecPerKm = $0 }), in: 150...600, step: 5) {
                    Text(profile.thresholdPaceSecPerKm != nil ? paceLabel(profile.thresholdPaceSecPerKm!) : "Non renseignée")
                }
            }

            OnboardingField(label: "CSS natation (min/100m, si connue)") {
                Stepper(value: Binding(get: { profile.cssPaceSecPer100m ?? 100 }, set: { profile.cssPaceSecPer100m = $0 }), in: 50...240, step: 1) {
                    Text(profile.cssPaceSecPer100m != nil ? "\(paceLabel(profile.cssPaceSecPer100m!))/100m" : "Non renseignée")
                }
            }
        }
    }

    private func paceLabel(_ seconds: Int) -> String {
        String(format: "%d:%02d /km", seconds / 60, seconds % 60)
    }
}
