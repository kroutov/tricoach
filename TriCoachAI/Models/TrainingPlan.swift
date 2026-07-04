import Foundation

struct Microcycle: Codable, Equatable, Identifiable {
    var id: UUID = UUID()
    var weekNumber: Int
    var startDate: Date
    var endDate: Date
    var isRecoveryWeek: Bool = false
    var plannedLoad: Double = 0
    var workouts: [Workout] = []
}

struct Mesocycle: Codable, Equatable, Identifiable {
    var id: UUID = UUID()
    var name: String
    var focus: String
    var loadTarget: Double?
    var startDate: Date
    var endDate: Date
    var microcycles: [Microcycle] = []
}

struct Macrocycle: Codable, Equatable, Identifiable {
    var id: UUID = UUID()
    var name: String
    var phase: MacrocyclePhase
    var startDate: Date
    var endDate: Date
    var mesocycles: [Mesocycle] = []
}

struct TrainingPlan: Codable, Equatable, Identifiable {
    var id: UUID = UUID()
    var goalId: UUID
    var startDate: Date
    var endDate: Date
    var durationWeeks: Int
    var status: PlanStatus = .draft
    var generationVersion: String = "rule-based-v1"
    var createdAt: Date = .now
    var macrocycles: [Macrocycle] = []

    var allMicrocycles: [Microcycle] {
        macrocycles.flatMap { $0.mesocycles.flatMap(\.microcycles) }
    }

    var allWorkouts: [Workout] {
        allMicrocycles.flatMap(\.workouts)
    }

    func workouts(on date: Date) -> [Workout] {
        let cal = Calendar.current
        return allWorkouts.filter { cal.isDate($0.date, inSameDayAs: date) }
    }

    func workouts(from: Date, to: Date) -> [Workout] {
        allWorkouts
            .filter { $0.date >= from && $0.date <= to }
            .sorted { $0.date < $1.date }
    }

    /// Finds a workout by id anywhere in the macro/meso/microcycle tree and
    /// applies an in-place mutation (used for status updates from the UI).
    mutating func updateWorkout(id: UUID, transform: (inout Workout) -> Void) {
        for mi in macrocycles.indices {
            for mei in macrocycles[mi].mesocycles.indices {
                for mci in macrocycles[mi].mesocycles[mei].microcycles.indices {
                    for wi in macrocycles[mi].mesocycles[mei].microcycles[mci].workouts.indices {
                        if macrocycles[mi].mesocycles[mei].microcycles[mci].workouts[wi].id == id {
                            transform(&macrocycles[mi].mesocycles[mei].microcycles[mci].workouts[wi])
                            return
                        }
                    }
                }
            }
        }
    }

    /// Applies a mutation to the next microcycle that hasn't started yet —
    /// the target of adaptation-engine load adjustments.
    mutating func updateNextUpcomingMicrocycle(transform: (inout Microcycle) -> Void) {
        var earliestPath: (Int, Int, Int)?
        var earliestStart: Date?
        for mi in macrocycles.indices {
            for mei in macrocycles[mi].mesocycles.indices {
                for mci in macrocycles[mi].mesocycles[mei].microcycles.indices {
                    let microcycle = macrocycles[mi].mesocycles[mei].microcycles[mci]
                    guard microcycle.startDate > .now else { continue }
                    if earliestStart == nil || microcycle.startDate < earliestStart! {
                        earliestStart = microcycle.startDate
                        earliestPath = (mi, mei, mci)
                    }
                }
            }
        }
        guard let path = earliestPath else { return }
        transform(&macrocycles[path.0].mesocycles[path.1].microcycles[path.2])
    }
}
