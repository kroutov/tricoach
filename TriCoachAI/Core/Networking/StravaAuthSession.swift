import AuthenticationServices
import UIKit

enum StravaAuthError: Error, LocalizedError {
    case invalidCallback
    case serverError(String)
    case notConfigured

    var errorDescription: String? {
        switch self {
        case .invalidCallback: return "Réponse de connexion Strava invalide."
        case .serverError(let message): return "Erreur Strava : \(message)"
        case .notConfigured: return "Strava n'est pas configuré côté serveur (identifiants manquants)."
        }
    }
}

/// Drives the browser leg of the backend-brokered Strava OAuth flow: opens
/// the authorize URL in `ASWebAuthenticationSession`, and resolves once the
/// backend's `/callback` redirects back into the app via the `tricoach://`
/// URL scheme (see `project.yml` CFBundleURLTypes).
@MainActor
final class StravaAuthSession: NSObject, ASWebAuthenticationPresentationContextProviding {
    private static let callbackScheme = "tricoach"

    func connect(authorizeURL: URL) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            let session = ASWebAuthenticationSession(url: authorizeURL, callbackURLScheme: Self.callbackScheme) { callbackURL, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                let items = callbackURL.flatMap { URLComponents(url: $0, resolvingAgainstBaseURL: false)?.queryItems }
                guard let status = items?.first(where: { $0.name == "status" })?.value else {
                    continuation.resume(throwing: StravaAuthError.invalidCallback)
                    return
                }
                if status == "success" {
                    continuation.resume()
                } else {
                    let message = items?.first(where: { $0.name == "message" })?.value ?? "unknown_error"
                    continuation.resume(throwing: StravaAuthError.serverError(message))
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            if !session.start() {
                continuation.resume(throwing: StravaAuthError.invalidCallback)
            }
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow) ?? ASPresentationAnchor()
    }
}
