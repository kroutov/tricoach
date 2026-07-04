import SwiftUI

/// Base card container used across Dashboard, Calendar and Workout Detail.
struct CardView<Content: View>: View {
    var padding: CGFloat = TCSpacing.md
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding)
            .background(TCColor.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: TCRadius.card, style: .continuous))
    }
}

#Preview {
    CardView {
        VStack(alignment: .leading, spacing: TCSpacing.sm) {
            Text("Charge hebdomadaire")
                .font(TCFont.headline)
            Text("312 TSS")
                .font(TCFont.metric)
        }
    }
    .padding()
}
