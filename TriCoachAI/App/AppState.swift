import Foundation
import Observation

enum AppRoute {
    case auth
    case onboarding
    case main
}

@MainActor
@Observable
final class AppState {
    private(set) var currentUser: User?
    private let container: DependencyContainer

    init(container: DependencyContainer) {
        self.container = container
        currentUser = container.userSessionRepository.currentUser()
    }

    var route: AppRoute {
        guard let currentUser else { return .auth }
        return currentUser.hasCompletedOnboarding ? .main : .onboarding
    }

    func completeSignIn(_ user: User) {
        container.userSessionRepository.save(user)
        currentUser = user
    }

    func completeOnboarding() async {
        guard var user = currentUser else { return }
        user.hasCompletedOnboarding = true
        do {
            let updated = try await container.userAPI.update(hasCompletedOnboarding: true)
            container.userSessionRepository.save(updated)
            currentUser = updated
        } catch {
            // Backend unreachable: keep the local flag so onboarding doesn't
            // loop; the next successful sync reconciles the server record.
            container.userSessionRepository.save(user)
            currentUser = user
        }
    }

    /// Reconciles the shared user record after a direct `/me` update made
    /// outside onboarding (e.g. saving the profile location) — same
    /// persist-then-publish shape as `completeOnboarding`'s success path.
    func setCurrentUser(_ user: User) {
        container.userSessionRepository.save(user)
        currentUser = user
    }

    func signOut() {
        KeychainTokenStore.shared.clear()
        container.userSessionRepository.signOut()
        currentUser = nil
    }
}
