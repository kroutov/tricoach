import Foundation

final class NetworkAdaptationEventRepository: AdaptationEventRepository {
    private let client: APIClient
    private let cache: SwiftDataAdaptationEventRepository

    init(client: APIClient = .shared, cache: SwiftDataAdaptationEventRepository) {
        self.client = client
        self.cache = cache
    }

    func fetchEvents(planId: UUID) async throws -> [AdaptationEvent] {
        do {
            let events: [AdaptationEvent] = try await client.get("plans/\(planId.uuidString)/adaptation-events")
            events.forEach(cache.save)
            return events
        } catch {
            return cache.fetchEvents(planId: planId)
        }
    }
}
