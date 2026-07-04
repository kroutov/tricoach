import SwiftUI

struct PillBadge: View {
    let text: String
    let tint: Color

    var body: some View {
        Text(text)
            .font(TCFont.caption.weight(.semibold))
            .padding(.horizontal, TCSpacing.sm)
            .padding(.vertical, 4)
            .background(tint.opacity(0.15))
            .foregroundStyle(tint)
            .clipShape(Capsule())
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    var tint: Color = TCColor.brand

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(TCFont.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, TCSpacing.sm + 4)
            .background(tint.opacity(configuration.isPressed ? 0.8 : 1))
            .clipShape(RoundedRectangle(cornerRadius: TCRadius.control, style: .continuous))
    }
}

#Preview {
    VStack(spacing: TCSpacing.md) {
        HStack {
            PillBadge(text: "Facile", tint: TCColor.intensityEasy)
            PillBadge(text: "Difficile", tint: TCColor.intensityHard)
        }
        Button("Générer mon plan") {}
            .buttonStyle(PrimaryButtonStyle())
    }
    .padding()
}
