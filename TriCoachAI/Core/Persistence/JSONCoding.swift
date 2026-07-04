import Foundation

/// Shared JSON coding config so local persistence payloads and (Phase 2)
/// network DTOs serialize dates the same way. Node's `Date.toISOString()`
/// (used by every `res.json()` on the backend) always includes milliseconds
/// (e.g. `2026-07-03T13:33:15.123Z`) — Swift's built-in `.iso8601` strategy
/// does *not* parse fractional seconds by default and throws on every such
/// payload, so both directions go through an explicit formatter instead.
private let iso8601WithFractionalSeconds: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
}()

private let iso8601WithoutFractionalSeconds: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    return formatter
}()

extension JSONEncoder {
    static let tricoach: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .custom { date, encoder in
            var container = encoder.singleValueContainer()
            try container.encode(iso8601WithFractionalSeconds.string(from: date))
        }
        return encoder
    }()
}

extension JSONDecoder {
    static let tricoach: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let string = try container.decode(String.self)
            if let date = iso8601WithFractionalSeconds.date(from: string) ?? iso8601WithoutFractionalSeconds.date(from: string) {
                return date
            }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid ISO8601 date: \(string)")
        }
        return decoder
    }()
}
