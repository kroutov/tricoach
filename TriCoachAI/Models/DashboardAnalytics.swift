import Foundation

struct WeeklyLoadPoint: Codable, Identifiable {
    var weekNumber: Int
    var startDate: Date
    var plannedLoad: Double
    var completedLoad: Double

    var id: Int { weekNumber }
}

struct LoadFormPoint: Codable, Identifiable {
    var date: Date
    var ctl: Double
    var atl: Double
    var tsb: Double

    var id: Date { date }
}

struct ZoneDistributionPoint: Codable, Identifiable {
    var intensity: WorkoutIntensity
    var count: Int
    var totalLoad: Double

    var id: WorkoutIntensity { intensity }
}

struct VO2MaxPoint: Codable, Identifiable {
    var date: Date
    var vo2max: Double

    var id: Date { date }
}

/// `GET /dashboard/analytics` — when `hasActivePlan` is false the backend
/// omits every other key, so the rest decode as empty rather than failing.
struct DashboardAnalytics: Codable {
    var hasActivePlan: Bool
    var weeklyLoad: [WeeklyLoadPoint]
    var loadForm: [LoadFormPoint]
    var zoneDistribution: [ZoneDistributionPoint]
    var vo2maxTrend: [VO2MaxPoint]

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        hasActivePlan = try container.decode(Bool.self, forKey: .hasActivePlan)
        weeklyLoad = try container.decodeIfPresent([WeeklyLoadPoint].self, forKey: .weeklyLoad) ?? []
        loadForm = try container.decodeIfPresent([LoadFormPoint].self, forKey: .loadForm) ?? []
        zoneDistribution = try container.decodeIfPresent([ZoneDistributionPoint].self, forKey: .zoneDistribution) ?? []
        vo2maxTrend = try container.decodeIfPresent([VO2MaxPoint].self, forKey: .vo2maxTrend) ?? []
    }
}
