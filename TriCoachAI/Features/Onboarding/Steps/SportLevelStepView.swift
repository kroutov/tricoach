import SwiftUI

struct SportLevelStepView: View {
    @Binding var profile: AthleteProfile

    var body: some View {
        VStack(alignment: .leading, spacing: TCSpacing.lg) {
            Text("Quel est votre niveau ?")
                .font(TCFont.title)

            VStack(spacing: TCSpacing.sm) {
                ForEach(AthleteLevel.allCases) { level in
                    Button {
                        profile.level = level
                    } label: {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(level.label).font(TCFont.headline)
                                Text(description(for: level))
                                    .font(TCFont.caption)
                                    .foregroundStyle(TCColor.secondaryText)
                            }
                            Spacer()
                            if profile.level == level {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(TCColor.brand)
                            }
                        }
                        .padding(TCSpacing.sm)
                        .background(profile.level == level ? TCColor.brand.opacity(0.1) : TCColor.cardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: TCRadius.control, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(TCColor.primaryText)
                }
            }
        }
    }

    private func description(for level: AthleteLevel) -> String {
        switch level {
        case .beginner: return "Vous découvrez ce sport ou reprenez après une longue pause."
        case .intermediate: return "Vous vous entraînez régulièrement depuis plus d'un an."
        case .advanced: return "Vous avez déjà bouclé des courses et structurez votre entraînement."
        }
    }
}
