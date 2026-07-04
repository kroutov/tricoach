import Foundation

final class NetworkCheckInRepository: CheckInRepository {
    private let client: APIClient
    private let cache: SwiftDataCheckInRepository

    init(client: APIClient = .shared, cache: SwiftDataCheckInRepository) {
        self.client = client
        self.cache = cache
    }

    func fetchRecentCheckIns(days: Int) async throws -> [ConstraintCheckIn] {
        do {
            let checkIns: [ConstraintCheckIn] = try await client.get("me/constraints", query: ["days": String(days)])
            checkIns.forEach(cache.save)
            return checkIns
        } catch {
            return cache.fetchRecentCheckIns(days: days)
        }
    }

    func save(_ checkIn: ConstraintCheckIn) async throws {
        let saved: ConstraintCheckIn = try await client.send(.post, "me/constraints", body: checkIn)
        cache.save(saved)
    }
}
