import SwiftUI

/// Horizontal stacked bar showing time-in-zone distribution (5 HR/power zones).
struct ZoneBar: View {
    /// Fractions (0...1) for zones 1 through 5, expected to sum to ~1.
    let zoneFractions: [Double]
    var height: CGFloat = 10

    private static let zoneColors: [Color] = [
        .blue, .green, .yellow, .orange, .red,
    ]

    var body: some View {
        GeometryReader { geo in
            HStack(spacing: 2) {
                ForEach(Array(zoneFractions.enumerated()), id: \.offset) { index, fraction in
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Self.zoneColors[safe: index] ?? .gray)
                        .frame(width: geo.size.width * fraction)
                }
            }
        }
        .frame(height: height)
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

#Preview {
    ZoneBar(zoneFractions: [0.35, 0.30, 0.15, 0.12, 0.08])
        .padding()
}
