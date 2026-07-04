import AuthenticationServices
import Foundation
import Observation

@MainActor
@Observable
final class AuthViewModel {
    var errorMessage: String?
    var isLoading = false

    private let authAPI: AuthAPIClient
    private let tokenStore: KeychainTokenStore

    init(authAPI: AuthAPIClient, tokenStore: KeychainTokenStore = .shared) {
        self.authAPI = authAPI
        self.tokenStore = tokenStore
    }

    func handleAppleSignIn(result: Result<ASAuthorization, Error>) async -> User? {
        switch result {
        case .failure(let error):
            errorMessage = "Connexion Apple impossible : \(error.localizedDescription). Vérifiez qu'un compte Apple est configuré (Réglages du simulateur) et que le projet a une équipe de développement Apple assignée pour le déploiement réel."
            return nil
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = credential.identityToken,
                  let identityToken = String(data: tokenData, encoding: .utf8)
            else {
                errorMessage = "Identifiant Apple invalide."
                return nil
            }
            let fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
                .compactMap { $0 }
                .joined(separator: " ")

            return await signIn { try await self.authAPI.signInWithApple(identityToken: identityToken, fullName: fullName.isEmpty ? nil : fullName) }
        }
    }

    /// Local demo session — round-trips through the backend's dev-only
    /// bypass so the app can be exercised end-to-end without a configured
    /// Apple Developer Team/entitlement.
    func continueAsDemoUser() async -> User? {
        let appleUserId = "demo-\(UUID().uuidString.prefix(8))"
        return await signIn { try await self.authAPI.devLogin(appleUserId: appleUserId, email: nil, fullName: "Athlète Démo") }
    }

    private func signIn(_ call: () async throws -> AuthResponse) async -> User? {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let response = try await call()
            tokenStore.save(response.token)
            return response.user
        } catch {
            errorMessage = "Connexion au serveur impossible : \(error.localizedDescription). Assurez-vous que le backend tourne (cd tricoach-backend && npm run dev)."
            return nil
        }
    }
}
