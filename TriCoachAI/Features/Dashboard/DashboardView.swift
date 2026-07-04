import SwiftUI

struct DashboardView: View {
    let container: DependencyContainer
    @State private var viewModel: DashboardViewModel

    init(container: DependencyContainer) {
        self.container = container
        _viewModel = State(initialValue: DashboardViewModel(container: container))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                if viewModel.plan == nil {
                    ContentUnavailableView("Aucun plan actif", systemImage: "calendar.badge.exclamationmark", description: Text("Terminez l'onboarding pour générer votre plan."))
                        .padding(.top, TCSpacing.xl)
                } else {
                    VStack(spacing: TCSpacing.md) {
                        weekCard
                        loadCard
                        analyticsLinkCard
                        if !viewModel.upcomingWorkouts.isEmpty {
                            upcomingCard
                        }
                        healthPlaceholderCard
                        if !viewModel.recentAdaptationEvents.isEmpty {
                            adaptationCard
                        }
                    }
                    .padding(TCSpacing.md)
                }
            }
            .navigationTitle("Dashboard")
            .task { await viewModel.refresh() }
        }
    }

    private var weekCard: some View {
        CardView {
            HStack(spacing: TCSpacing.md) {
                ZStack {
                    ProgressRingView(progress: viewModel.weekCompletionProgress)
                    Text("\(Int(viewModel.weekCompletionProgress * 100))%")
                        .font(TCFont.metricLabel)
                }
                .frame(width: 64, height: 64)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Séances de la semaine complétées à \(Int(viewModel.weekCompletionProgress * 100)) %")

                VStack(alignment: .leading, spacing: 4) {
                    Text(viewModel.weekNumberLabel).font(TCFont.headline)
                    Text(viewModel.currentPhaseLabel).font(TCFont.subheadline).foregroundStyle(TCColor.secondaryText)
                    if viewModel.currentMicrocycle?.isRecoveryWeek == true {
                        PillBadge(text: "Semaine allégée", tint: TCColor.intensityEasy)
                    }
                }
                Spacer()
            }
        }
    }

    private var loadCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: TCSpacing.sm) {
                Text("Charge de la semaine").font(TCFont.headline)
                HStack {
                    metric(value: "\(Int(viewModel.weekCompletedLoad))", label: "TSS réalisés")
                    metric(value: "\(Int(viewModel.weekPlannedLoad))", label: "TSS planifiés")
                }
            }
        }
    }

    private func metric(value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value).font(TCFont.metric)
            Text(label).font(TCFont.metricLabel).foregroundStyle(TCColor.secondaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var upcomingCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: TCSpacing.sm) {
                Text("Prochaines séances").font(TCFont.headline)
                ForEach(viewModel.upcomingWorkouts) { workout in
                    WorkoutRowView(workout: workout)
                }
            }
        }
    }

    private var analyticsLinkCard: some View {
        NavigationLink {
            DashboardAnalyticsView(container: container)
        } label: {
            CardView {
                HStack {
                    Label("Analytique complète", systemImage: "chart.xyaxis.line")
                        .font(TCFont.headline)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .foregroundStyle(TCColor.secondaryText)
                        .accessibilityHidden(true)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private var healthPlaceholderCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: TCSpacing.xs) {
                Label("VO2max, HRV, sommeil", systemImage: "heart.text.square")
                    .font(TCFont.headline)
                Text("Connectez HealthKit et Strava (Phase 3) pour voir vos tendances de forme, fatigue et récupération ici.")
                    .font(TCFont.caption)
                    .foregroundStyle(TCColor.secondaryText)
            }
        }
    }

    private var adaptationCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: TCSpacing.sm) {
                Text("Dernières adaptations").font(TCFont.headline)
                ForEach(viewModel.recentAdaptationEvents) { event in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(event.triggeredBy.label).font(TCFont.subheadline.weight(.semibold))
                        Text(event.actionTaken).font(TCFont.caption).foregroundStyle(TCColor.secondaryText)
                    }
                    if event.id != viewModel.recentAdaptationEvents.last?.id {
                        Divider()
                    }
                }
                NavigationLink("Voir tout l'historique") {
                    AdaptationHistoryView(container: container)
                }
                .font(TCFont.caption.weight(.semibold))
            }
        }
    }
}
