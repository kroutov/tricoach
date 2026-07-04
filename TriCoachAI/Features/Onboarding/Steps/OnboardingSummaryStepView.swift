import SwiftUI

struct OnboardingSummaryStepView: View {
    var viewModel: OnboardingViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: TCSpacing.md) {
            Text("Résumé")
                .font(TCFont.title)
            Text("Vérifiez vos informations avant de générer votre plan personnalisé.")
                .font(TCFont.caption)
                .foregroundStyle(TCColor.secondaryText)

            CardView {
                VStack(alignment: .leading, spacing: TCSpacing.xs) {
                    Label("\(viewModel.profile.level.label) • \(viewModel.profile.age.map { "\($0) ans" } ?? "âge non renseigné")", systemImage: "person.fill")
                    if let volume = viewModel.profile.weeklyVolumeAvgMin {
                        Label("\(volume) min/semaine en moyenne actuellement", systemImage: "chart.bar.fill")
                    }
                }
                .font(TCFont.subheadline)
            }

            CardView {
                VStack(alignment: .leading, spacing: TCSpacing.xs) {
                    Text("Objectifs").font(TCFont.headline)
                    ForEach(viewModel.goals) { goal in
                        Label("\(goal.type.label) — \(goal.priority.label) — \(goal.targetDate.formatted(date: .abbreviated, time: .omitted))", systemImage: "flag.fill")
                            .font(TCFont.subheadline)
                    }
                }
            }

            CardView {
                VStack(alignment: .leading, spacing: TCSpacing.xs) {
                    Text("Disponibilités").font(TCFont.headline)
                    Label("\(viewModel.availability.sessionsPerWeek) séances/semaine, \(viewModel.availability.maxSessionDurationMin) min max", systemImage: "calendar")
                        .font(TCFont.subheadline)
                    Label(viewModel.availability.availableDays.sorted { Weekday.orderedWeek.firstIndex(of: $0)! < Weekday.orderedWeek.firstIndex(of: $1)! }.map(\.label).joined(separator: ", "), systemImage: "clock")
                        .font(TCFont.subheadline)
                }
            }

            CardView {
                VStack(alignment: .leading, spacing: TCSpacing.xs) {
                    Text("Contraintes").font(TCFont.headline)
                    Label("Fatigue \(viewModel.checkIn.fatigueLevel)/5 · Stress \(viewModel.checkIn.stressLevel)/5 · Sommeil \(String(format: "%.1f", viewModel.checkIn.sleepHours))h", systemImage: "heart.text.square")
                        .font(TCFont.subheadline)
                    if !viewModel.checkIn.injuries.isEmpty {
                        Label(viewModel.checkIn.injuries.joined(separator: ", "), systemImage: "exclamationmark.triangle.fill")
                            .font(TCFont.subheadline)
                            .foregroundStyle(.orange)
                    }
                }
            }

            Text("Appuyez sur « Générer mon plan » pour construire votre programme périodisé.")
                .font(TCFont.caption)
                .foregroundStyle(TCColor.secondaryText)
        }
    }
}
