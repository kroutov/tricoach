import Foundation
import SwiftData

/// Local storage uses an "envelope" pattern: each record keeps a few
/// indexable/sortable columns (id, dates, status) plus the full domain
/// struct JSON-encoded in `payload`. This avoids hand-mirroring every
/// field twice — the real normalized schema is `tricoach-backend/prisma/schema.prisma`,
/// which this local cache will sync against starting Phase 2.

@Model
final class UserRecord {
    @Attribute(.unique) var id: UUID
    var appleUserId: String
    var payload: Data

    init(id: UUID, appleUserId: String, payload: Data) {
        self.id = id
        self.appleUserId = appleUserId
        self.payload = payload
    }
}

@Model
final class ProfileRecord {
    @Attribute(.unique) var id: UUID
    var updatedAt: Date
    var payload: Data

    init(id: UUID = UUID(), updatedAt: Date = .now, payload: Data) {
        self.id = id
        self.updatedAt = updatedAt
        self.payload = payload
    }
}

@Model
final class AvailabilityRecord {
    @Attribute(.unique) var id: UUID
    var updatedAt: Date
    var payload: Data

    init(id: UUID = UUID(), updatedAt: Date = .now, payload: Data) {
        self.id = id
        self.updatedAt = updatedAt
        self.payload = payload
    }
}

@Model
final class GoalRecord {
    @Attribute(.unique) var id: UUID
    var targetDate: Date
    var status: String
    var payload: Data

    init(id: UUID, targetDate: Date, status: String, payload: Data) {
        self.id = id
        self.targetDate = targetDate
        self.status = status
        self.payload = payload
    }
}

@Model
final class CheckInRecord {
    @Attribute(.unique) var id: UUID
    var date: Date
    var payload: Data

    init(id: UUID, date: Date, payload: Data) {
        self.id = id
        self.date = date
        self.payload = payload
    }
}

@Model
final class TrainingPlanRecord {
    @Attribute(.unique) var id: UUID
    var goalId: UUID
    var startDate: Date
    var endDate: Date
    var status: String
    var payload: Data

    init(id: UUID, goalId: UUID, startDate: Date, endDate: Date, status: String, payload: Data) {
        self.id = id
        self.goalId = goalId
        self.startDate = startDate
        self.endDate = endDate
        self.status = status
        self.payload = payload
    }
}

@Model
final class ActivityRecord {
    @Attribute(.unique) var id: UUID
    var startTime: Date
    var payload: Data

    init(id: UUID, startTime: Date, payload: Data) {
        self.id = id
        self.startTime = startTime
        self.payload = payload
    }
}

@Model
final class HealthMetricsRecord {
    @Attribute(.unique) var id: UUID
    var date: Date
    var payload: Data

    init(id: UUID, date: Date, payload: Data) {
        self.id = id
        self.date = date
        self.payload = payload
    }
}

@Model
final class AdaptationEventRecord {
    @Attribute(.unique) var id: UUID
    var planId: UUID
    var createdAt: Date
    var payload: Data

    init(id: UUID, planId: UUID, createdAt: Date, payload: Data) {
        self.id = id
        self.planId = planId
        self.createdAt = createdAt
        self.payload = payload
    }
}
