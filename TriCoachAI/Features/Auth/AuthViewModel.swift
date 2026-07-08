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

    /// Email/password path — the only way to reach the deployed (production)
    /// backend from a device without an Apple Developer Team, since
    /// `dev-login` is disabled outside development and Sign In with Apple
    /// requires the paid program.
    func register(email: String, password: String, fullName: String) async -> User? {
        await signInWithCredentials { try await self.authAPI.register(email: email, password: password, fullName: fullName.isEmpty ? nil : fullName) }
    }

    func login(email: String, password: String) async -> User? {
        await signInWithCredentials { try await self.authAPI.login(email: email, password: password) }
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

    /// Same round trip as `signIn`, but register/login failures are
    /// expected, everyday outcomes (wrong password, email taken) rather than
    /// infrastructure problems — surfaced with the matching short message
    /// instead of the generic "is the backend running?" hint.
    private func signInWithCredentials(_ call: () async throws -> AuthResponse) async -> User? {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let response = try await call()
            tokenStore.save(response.token)
            return response.user
        } catch NetworkError.server(_, let code) {
            errorMessage = Self.friendlyCredentialsMessage(for: code)
            return nil
        } catch NetworkError.unauthorized {
            // `/auth/login` reuses plain 401 for "wrong password" — APIClient
            // maps every 401 to `.unauthorized` (its usual meaning: expired
            // session) before the `email_taken`/`invalid_credentials` body
            // even gets parsed, so this case needs its own mapping rather
            // than falling through to the generic "is the backend running?"
            // message below.
            errorMessage = Self.friendlyCredentialsMessage(for: "invalid_credentials")
            return nil
        } catch {
            errorMessage = "Connexion au serveur impossible : \(error.localizedDescription). Assurez-vous que le backend tourne (cd tricoach-backend && npm run dev)."
            return nil
        }
    }

    private static func friendlyCredentialsMessage(for code: String?) -> String {
        switch code {
        case "email_taken": return "Un compte existe déjà avec cette adresse email."
        case "invalid_credentials": return "Email ou mot de passe incorrect."
        case "invalid_request": return "Vérifiez les informations saisies."
        default: return "Une erreur est survenue. Réessayez."
        }
    }
}
