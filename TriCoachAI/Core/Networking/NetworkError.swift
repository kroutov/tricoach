import Foundation

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

enum NetworkError: Error, LocalizedError {
    case invalidResponse
    case unauthorized
    case server(status: Int, message: String?)
    case decoding(Error)
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Réponse serveur invalide."
        case .unauthorized:
            return "Session expirée, merci de vous reconnecter."
        case .server(let status, let message):
            return message ?? "Erreur serveur (\(status))."
        case .decoding:
            return "Impossible de lire la réponse du serveur."
        case .transport:
            return "Impossible de contacter le serveur. Vérifiez votre connexion."
        }
    }
}

struct APIErrorBody: Decodable {
    let error: String
}
