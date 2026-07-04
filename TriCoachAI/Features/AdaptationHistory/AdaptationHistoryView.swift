import SwiftUI

struct AdaptationHistoryView: View {
    let container: DependencyContainer
    @State private var viewModel: AdaptationHistoryViewModel

    init(container: DependencyContainer) {
        self.container = container
        _viewModel = State(initialValue: AdaptationHistoryViewModel(container: container))
    }

    var body: some View {
        List {
            if viewModel.events.isEmpty && !viewModel.isLoading {
                ContentUnavailableView(
                    "Aucune adaptation",
                    systemImage: "arrow.triangle.2.circlepath",
                    description: Text("Votre plan n'a pas encore été ajusté automatiquement.")
                )
            } else {
                ForEach(viewModel.events) { event in
                    AdaptationEventRow(event: event)
                }
            }

            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage).font(TCFont.caption).foregroundStyle(.red)
            }
        }
        .navigationTitle("Historique d'adaptation")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
    }
}

private struct AdaptationEventRow: View {
    let event: AdaptationEvent

    var body: some View {
        VStack(alignment: .leading, spacing: TCSpacing.xs) {
            HStack {
                Text(event.triggeredBy.label).font(TCFont.headline)
                Spacer()
                if let deltaLoadPercent = event.deltaLoadPercent {
                    PillBadge(text: deltaLoadLabel(deltaLoadPercent), tint: deltaLoadPercent >= 0 ? TCColor.intensityEasy : TCColor.intensityHard)
                }
            }
            Text(event.actionTaken)
                .font(TCFont.subheadline)
                .foregroundStyle(TCColor.primaryText)
            Text(event.createdAt.formatted(date: .long, time: .shortened))
                .font(TCFont.caption)
                .foregroundStyle(TCColor.secondaryText)
        }
        .padding(.vertical, TCSpacing.xs)
        .accessibilityElement(children: .combine)
    }

    private func deltaLoadLabel(_ value: Double) -> String {
        let sign = value >= 0 ? "+" : ""
        return "\(sign)\(Int(value))%"
    }
}
