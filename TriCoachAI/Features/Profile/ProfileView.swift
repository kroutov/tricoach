import SwiftUI

struct ProfileView: View {
    let container: DependencyContainer
    let user: User?
    var onSignOut: () -> Void

    @State private var profile: AthleteProfile = .empty
    @State private var goals: [Goal] = []
    @State private var integrationsViewModel: IntegrationsViewModel

    init(container: DependencyContainer, user: User?, onSignOut: @escaping () -> Void) {
        self.container = container
        self.user = user
        self.onSignOut = onSignOut
        _integrationsViewModel = State(initialValue: IntegrationsViewModel(container: container))
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Compte") {
                    LabeledContent("Nom", value: user?.fullName ?? "Athlète")
                    if let email = user?.email {
                        LabeledContent("Email", value: email)
                    }
                }

                Section("Profil athlète") {
                    LabeledContent("Niveau", value: profile.level.label)
                    if let hrMax = profile.hrMax { LabeledContent("FC max", value: "\(hrMax) bpm") }
                    if let hrRest = profile.hrRest { LabeledContent("FC repos", value: "\(hrRest) bpm") }
                    if let ftp = profile.ftpWatts { LabeledContent("FTP", value: "\(ftp) W") }
                }

                Section("Objectifs") {
                    NavigationLink {
                        GoalsManagementView(container: container)
                    } label: {
                        if goals.isEmpty {
                            Text("Gérer mes objectifs")
                        } else {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Gérer mes objectifs (\(goals.count))")
                                if let primary = goals.first(where: { $0.priority == .a }) ?? goals.first {
                                    Text("\(primary.type.label) — \(primary.targetDate.formatted(date: .abbreviated, time: .omitted))")
                                        .font(TCFont.caption)
                                        .foregroundStyle(TCColor.secondaryText)
                                }
                            }
                        }
                    }
                }

                Section("Intégrations") {
                    IntegrationRow(
                        title: "HealthKit",
                        status: integrationsViewModel.healthKitStatus,
                        error: integrationsViewModel.healthKitError,
                        isLoading: integrationsViewModel.isRequestingHealthKit,
                        actionTitle: integrationsViewModel.isHealthKitConnected ? "Resynchroniser" : "Connecter"
                    ) {
                        if integrationsViewModel.isHealthKitConnected {
                            await integrationsViewModel.syncHealthKit()
                        } else {
                            await integrationsViewModel.connectHealthKit()
                        }
                    }

                    IntegrationRow(
                        title: "Strava",
                        status: integrationsViewModel.stravaStatus,
                        error: integrationsViewModel.stravaError,
                        isLoading: integrationsViewModel.isConnectingStrava,
                        actionTitle: integrationsViewModel.isStravaConnected ? "Déconnecter" : "Connecter",
                        destructive: integrationsViewModel.isStravaConnected
                    ) {
                        if integrationsViewModel.isStravaConnected {
                            await integrationsViewModel.disconnectStrava()
                        } else {
                            await integrationsViewModel.connectStrava()
                        }
                    }

                    IntegrationRow(
                        title: "Calendrier Apple",
                        status: integrationsViewModel.calendarSyncStatus,
                        error: integrationsViewModel.calendarError,
                        isLoading: integrationsViewModel.isSyncingCalendar,
                        actionTitle: "Synchroniser"
                    ) {
                        await integrationsViewModel.syncCalendar()
                    }

                    IntegrationRow(
                        title: "Rappels de séance",
                        status: integrationsViewModel.reminderStatus,
                        error: integrationsViewModel.reminderError,
                        isLoading: integrationsViewModel.isSchedulingReminders,
                        actionTitle: "Activer"
                    ) {
                        await integrationsViewModel.enableReminders()
                    }
                }

                Section {
                    Button("Se déconnecter", role: .destructive, action: onSignOut)
                }
            }
            .navigationTitle("Profil")
            .task {
                profile = (try? await container.profileRepository.loadProfile()) ?? .empty
                goals = (try? await container.goalRepository.fetchGoals()) ?? []
                await integrationsViewModel.loadStatuses()
            }
        }
    }
}

private struct IntegrationRow: View {
    let title: String
    let status: String
    let error: String?
    let isLoading: Bool
    let actionTitle: String
    var destructive: Bool = false
    let action: () async -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: TCSpacing.xs) {
            HStack {
                Text(title)
                Spacer()
                if isLoading {
                    ProgressView()
                } else {
                    Button(actionTitle, role: destructive ? .destructive : nil) {
                        Task { await action() }
                    }
                    .font(.subheadline)
                }
            }
            Text(status)
                .font(TCFont.caption)
                .foregroundStyle(TCColor.secondaryText)
            if let error {
                Text(error)
                    .font(TCFont.caption)
                    .foregroundStyle(.red)
            }
        }
    }
}
