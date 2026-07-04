import Foundation
import SwiftData

enum PersistenceContainer {
    static let schema = Schema([
        UserRecord.self,
        ProfileRecord.self,
        AvailabilityRecord.self,
        GoalRecord.self,
        CheckInRecord.self,
        TrainingPlanRecord.self,
        ActivityRecord.self,
        HealthMetricsRecord.self,
        AdaptationEventRecord.self,
    ])

    static func make(inMemory: Bool = false) -> ModelContainer {
        let configuration = ModelConfiguration(isStoredInMemoryOnly: inMemory)
        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Failed to create ModelContainer: \(error)")
        }
    }
}
