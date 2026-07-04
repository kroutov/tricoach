import Charts
import SwiftUI

struct DashboardAnalyticsView: View {
    let container: DependencyContainer
    @State private var viewModel: DashboardAnalyticsViewModel

    init(container: DependencyContainer) {
        self.container = container
        _viewModel = State(initialValue: DashboardAnalyticsViewModel(container: container))
    }

    var body: some View {
        ScrollView {
            if viewModel.isLoading && viewModel.analytics == nil {
                ProgressView().padding(.top, TCSpacing.xl)
            } else if !viewModel.hasActivePlan {
                ContentUnavailableView(
                    "Aucun plan actif",
                    systemImage: "chart.xyaxis.line",
                    description: Text("Générez un plan pour voir vos analyses de charge et de forme.")
                )
                .padding(.top, TCSpacing.xl)
            } else {
                VStack(spacing: TCSpacing.md) {
                    weeklyLoadCard
                    formCard
                    zoneDistributionCard
                    if !viewModel.vo2maxTrend.isEmpty {
                        vo2maxCard
                    }
                    if let errorMessage = viewModel.errorMessage {
                        Text(errorMessage).font(TCFont.caption).foregroundStyle(.red)
                    }
                }
                .padding(TCSpacing.md)
            }
        }
        .navigationTitle("Analytique")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
    }

    private var weeklyLoadCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: TCSpacing.sm) {
                Text("Charge hebdomadaire").font(TCFont.headline)
                if viewModel.weeklyLoad.isEmpty {
                    emptyState("Pas encore de semaines planifiées.")
                } else {
                    Chart(viewModel.weeklyLoad) { point in
                        BarMark(x: .value("Semaine", "S\(point.weekNumber)"), y: .value("TSS", point.plannedLoad))
                            .foregroundStyle(by: .value("Type", "Planifié"))
                            .position(by: .value("Type", "Planifié"))
                        BarMark(x: .value("Semaine", "S\(point.weekNumber)"), y: .value("TSS", point.completedLoad))
                            .foregroundStyle(by: .value("Type", "Réalisé"))
                            .position(by: .value("Type", "Réalisé"))
                    }
                    .chartForegroundStyleScale(["Planifié": TCColor.secondaryText.opacity(0.35), "Réalisé": TCColor.brand])
                    .frame(height: 180)
                    .accessibilityLabel("Graphique de charge hebdomadaire, planifiée contre réalisée")
                    .accessibilityValue(weeklyLoadSummary)
                }
            }
        }
    }

    private var weeklyLoadSummary: String {
        guard let latest = viewModel.weeklyLoad.last else { return "" }
        return "\(viewModel.weeklyLoad.count) semaines. Semaine \(latest.weekNumber) : \(Int(latest.completedLoad)) TSS réalisés sur \(Int(latest.plannedLoad)) planifiés."
    }

    private var formCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: TCSpacing.sm) {
                Text("Charge chronique / aiguë (forme)").font(TCFont.headline)
                if viewModel.loadForm.isEmpty {
                    emptyState("Pas encore de séances réalisées.")
                } else {
                    Chart(viewModel.loadForm) { point in
                        LineMark(x: .value("Date", point.date), y: .value("Charge", point.ctl))
                            .foregroundStyle(by: .value("Série", "CTL (fond)"))
                        LineMark(x: .value("Date", point.date), y: .value("Charge", point.atl))
                            .foregroundStyle(by: .value("Série", "ATL (fatigue)"))
                    }
                    .chartForegroundStyleScale(["CTL (fond)": TCColor.brand, "ATL (fatigue)": TCColor.intensityHard])
                    .frame(height: 180)
                    .accessibilityLabel("Graphique de charge chronique et aiguë")
                    .accessibilityValue(loadFormSummary)

                    if let latest = viewModel.loadForm.last {
                        Text(formLabel(for: latest.tsb))
                            .font(TCFont.caption)
                            .foregroundStyle(TCColor.secondaryText)
                    }
                }
            }
        }
    }

    private var loadFormSummary: String {
        guard let latest = viewModel.loadForm.last else { return "" }
        return "Charge chronique \(Int(latest.ctl)), charge aiguë \(Int(latest.atl)), forme \(Int(latest.tsb))."
    }

    private var zoneDistributionCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: TCSpacing.sm) {
                Text("Distribution des zones").font(TCFont.headline)
                if viewModel.zoneDistribution.allSatisfy({ $0.count == 0 }) {
                    emptyState("Pas encore de séances réalisées.")
                } else {
                    Chart(viewModel.zoneDistribution) { point in
                        BarMark(x: .value("Zone", point.intensity.label), y: .value("TSS", point.totalLoad))
                            .foregroundStyle(TCColor.color(for: point.intensity))
                    }
                    .frame(height: 160)
                    .accessibilityLabel("Graphique de distribution des zones d'intensité")
                    .accessibilityValue(zoneDistributionSummary)
                }
            }
        }
    }

    private var zoneDistributionSummary: String {
        viewModel.zoneDistribution
            .map { "\($0.intensity.label) : \(Int($0.totalLoad)) TSS sur \($0.count) séances" }
            .joined(separator: ", ")
    }

    private var vo2maxCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: TCSpacing.sm) {
                Text("Tendance VO2max").font(TCFont.headline)
                Chart(viewModel.vo2maxTrend) { point in
                    LineMark(x: .value("Date", point.date), y: .value("VO2max", point.vo2max))
                        .foregroundStyle(TCColor.brand)
                }
                .frame(height: 140)
                .accessibilityLabel("Graphique de tendance VO2max")
                .accessibilityValue(vo2maxSummary)
            }
        }
    }

    private var vo2maxSummary: String {
        guard let latest = viewModel.vo2maxTrend.last else { return "" }
        let latestText = "Dernière mesure : \(String(format: "%.1f", latest.vo2max)) ml/kg/min le \(latest.date.formatted(date: .abbreviated, time: .omitted))."
        guard viewModel.vo2maxTrend.count > 1, let first = viewModel.vo2maxTrend.first else { return latestText }
        let trend = latest.vo2max > first.vo2max ? "en hausse" : (latest.vo2max < first.vo2max ? "en baisse" : "stable")
        return "\(latestText) Tendance \(trend) depuis la première mesure."
    }

    private func emptyState(_ text: String) -> some View {
        Text(text).font(TCFont.caption).foregroundStyle(TCColor.secondaryText)
    }

    private func formLabel(for tsb: Double) -> String {
        if tsb > 5 { return "Forme fraîche : vous pouvez encaisser une charge plus élevée." }
        if tsb < -15 { return "Fatigue élevée : privilégiez la récupération sur les prochains jours." }
        return "Charge équilibrée entre fond et fatigue récente."
    }
}
