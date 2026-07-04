import Foundation

/// Thin async/await REST client. Callers pass/receive `Codable` domain
/// models directly (see `Models/`) — the same types the local SwiftData
/// repositories use, so a repository can switch between local and network
/// backing without its call sites changing shape.
final class APIClient {
    static let shared = APIClient()

    private let baseURL: URL
    private let tokenStore: KeychainTokenStore
    private let session: URLSession
    private let encoder = JSONEncoder.tricoach
    private let decoder = JSONDecoder.tricoach

    init(baseURL: URL = APIConfig.baseURL, tokenStore: KeychainTokenStore = .shared, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.tokenStore = tokenStore
        self.session = session
    }

    func get<Response: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> Response {
        try await perform(.get, path, query: query, bodyData: nil)
    }

    func send<Body: Encodable, Response: Decodable>(_ method: HTTPMethod, _ path: String, body: Body) async throws -> Response {
        try await perform(method, path, query: [:], bodyData: try encoder.encode(body))
    }

    func send<Response: Decodable>(_ method: HTTPMethod, _ path: String) async throws -> Response {
        try await perform(method, path, query: [:], bodyData: nil)
    }

    func sendNoContent<Body: Encodable>(_ method: HTTPMethod, _ path: String, body: Body) async throws {
        _ = try await performRaw(method, path, query: [:], bodyData: try encoder.encode(body))
    }

    func sendNoContent(_ method: HTTPMethod, _ path: String) async throws {
        _ = try await performRaw(method, path, query: [:], bodyData: nil)
    }

    private func perform<Response: Decodable>(_ method: HTTPMethod, _ path: String, query: [String: String], bodyData: Data?) async throws -> Response {
        let data = try await performRaw(method, path, query: query, bodyData: bodyData)
        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            throw NetworkError.decoding(error)
        }
    }

    private func performRaw(_ method: HTTPMethod, _ path: String, query: [String: String], bodyData: Data?) async throws -> Data {
        var url = baseURL.appendingPathComponent(path)
        if !query.isEmpty, var components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
            url = components.url ?? url
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = bodyData
        if let token = tokenStore.token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw NetworkError.transport(error)
        }

        guard let http = response as? HTTPURLResponse else { throw NetworkError.invalidResponse }

        switch http.statusCode {
        case 200...299:
            return data
        case 401:
            throw NetworkError.unauthorized
        default:
            let message = try? JSONDecoder().decode(APIErrorBody.self, from: data).error
            throw NetworkError.server(status: http.statusCode, message: message)
        }
    }
}
