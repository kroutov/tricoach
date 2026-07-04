import Foundation

/// Backend is the source of truth; the SwiftData cache is written through on
/// every success and used as a fallback when the network call fails.
final class NetworkProfileRepository: ProfileRepository {
    private let client: APIClient
    private let cache: SwiftDataProfileRepository

    init(client: APIClient = .shared, cache: SwiftDataProfileRepository) {
        self.client = client
        self.cache = cache
    }

    func loadProfile() async throws -> AthleteProfile {
        do {
            let profile: AthleteProfile = try await client.get("me/profile")
            cache.save(profile)
            return profile
        } catch {
            return cache.loadProfile()
        }
    }

    func save(_ profile: AthleteProfile) async throws {
        let saved: AthleteProfile = try await client.send(.put, "me/profile", body: profile)
        cache.save(saved)
    }

    func loadAvailability() async throws -> Availability {
        do {
            let availability: Availability = try await client.get("me/availability")
            cache.save(availability)
            return availability
        } catch {
            return cache.loadAvailability()
        }
    }

    func save(_ availability: Availability) async throws {
        let saved: Availability = try await client.send(.put, "me/availability", body: availability)
        cache.save(saved)
    }
}
