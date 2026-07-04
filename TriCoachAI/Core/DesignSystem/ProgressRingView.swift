import SwiftUI

/// Circular progress indicator used for weekly load / plan completion.
struct ProgressRingView: View {
    let progress: Double // 0...1
    var lineWidth: CGFloat = 10
    var tint: Color = TCColor.brand

    var body: some View {
        ZStack {
            Circle()
                .stroke(tint.opacity(0.15), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: min(max(progress, 0), 1))
                .stroke(tint, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.5), value: progress)
        }
    }
}

#Preview {
    ProgressRingView(progress: 0.68)
        .frame(width: 100, height: 100)
        .padding()
}
