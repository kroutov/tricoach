import SwiftUI

struct RootView: View {
    let container: DependencyContainer
    @State private var appState: AppState

    init(container: DependencyContainer) {
        self.container = container
        _appState = State(initialValue: AppState(container: container))
    }

    var body: some View {
        Group {
            switch appState.route {
            case .auth:
                AuthView(container: container) { user in
                    appState.completeSignIn(user)
                }
            case .onboarding:
                OnboardingFlowView(container: container) { _ in
                    Task { await appState.completeOnboarding() }
                }
            case .main:
                MainTabView(container: container, appState: appState)
            }
        }
        .animation(.easeInOut, value: appState.route)
    }
}

extension AppRoute: Equatable {}

#Preview {
    RootView(container: DependencyContainer(modelContainer: PersistenceContainer.make(inMemory: true)))
}
