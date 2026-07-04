import Foundation

enum Sex: String, Codable, CaseIterable, Identifiable {
    case male, female, other
    var id: String { rawValue }

    var label: String {
        switch self {
        case .male: return "Homme"
        case .female: return "Femme"
        case .other: return "Autre"
        }
    }
}

enum AthleteLevel: String, Codable, CaseIterable, Identifiable {
    case beginner, intermediate, advanced
    var id: String { rawValue }

    var label: String {
        switch self {
        case .beginner: return "Débutant"
        case .intermediate: return "Intermédiaire"
        case .advanced: return "Avancé"
        }
    }
}

enum GoalType: String, Codable, CaseIterable, Identifiable {
    case triathlonSprint, triathlonOlympic, duathlon
    case run10k, halfMarathon, marathon
    case ironman, halfIronman
    case improveVMA, weightLoss, generalEndurance

    var id: String { rawValue }

    var label: String {
        switch self {
        case .triathlonSprint: return "Triathlon Sprint"
        case .triathlonOlympic: return "Triathlon Olympique"
        case .duathlon: return "Duathlon"
        case .run10k: return "10 km"
        case .halfMarathon: return "Semi-marathon"
        case .marathon: return "Marathon"
        case .ironman: return "Ironman"
        case .halfIronman: return "Semi-Ironman (70.3)"
        case .improveVMA: return "Améliorer sa VMA"
        case .weightLoss: return "Perdre du poids"
        case .generalEndurance: return "Améliorer l'endurance"
        }
    }

    /// Sports involved, used by the plan engine to balance weekly sessions.
    var sports: [SportType] {
        switch self {
        case .triathlonSprint, .triathlonOlympic, .ironman, .halfIronman:
            return [.swim, .bike, .run, .brick]
        case .duathlon:
            return [.run, .bike, .brick]
        case .run10k, .halfMarathon, .marathon, .improveVMA:
            return [.run]
        case .weightLoss, .generalEndurance:
            return [.run, .bike, .swim]
        }
    }

    /// Approximate total weeks recommended end-to-end (used as a default when
    /// the user picks "durée libre jusqu'à une course cible").
    var recommendedWeeks: Int {
        switch self {
        case .run10k, .improveVMA: return 8
        case .halfMarathon, .duathlon, .triathlonSprint: return 12
        case .marathon, .triathlonOlympic, .halfIronman: return 16
        case .ironman: return 24
        case .weightLoss, .generalEndurance: return 12
        }
    }
}

enum GoalPriority: String, Codable, CaseIterable, Identifiable {
    case a, b, c
    var id: String { rawValue }
    var label: String { "Priorité \(rawValue.uppercased())" }
}

enum GoalStatus: String, Codable {
    case active, achieved, abandoned
}

enum PlanStatus: String, Codable {
    case draft, active, completed, archived
}

enum MacrocyclePhase: String, Codable, CaseIterable {
    case base, build, peak, taper, transition

    var label: String {
        switch self {
        case .base: return "Base"
        case .build: return "Développement"
        case .peak: return "Affûtage spécifique"
        case .taper: return "Affûtage final"
        case .transition: return "Transition"
        }
    }
}

enum SportType: String, Codable, CaseIterable, Identifiable {
    case run, bike, swim, brick, strength, rest
    var id: String { rawValue }

    var label: String {
        switch self {
        case .run: return "Course à pied"
        case .bike: return "Vélo"
        case .swim: return "Natation"
        case .brick: return "Enchaînement (brick)"
        case .strength: return "Renforcement"
        case .rest: return "Repos"
        }
    }

    var systemImage: String {
        switch self {
        case .run: return "figure.run"
        case .bike: return "figure.outdoor.cycle"
        case .swim: return "figure.pool.swim"
        case .brick: return "arrow.triangle.2.circlepath"
        case .strength: return "dumbbell"
        case .rest: return "bed.double"
        }
    }
}

enum WorkoutIntensity: String, Codable, CaseIterable {
    case easy, moderate, hard

    var label: String {
        switch self {
        case .easy: return "Facile"
        case .moderate: return "Modérée"
        case .hard: return "Difficile"
        }
    }
}

enum WorkoutStatus: String, Codable {
    case planned, completed, skipped, modified
}

enum ActivitySource: String, Codable {
    case healthKit, strava, manual
}

enum AdaptationTrigger: String, Codable {
    case missedWorkout, overperformance, underperformance, highFatigue, injuryFlag, lowRecovery, physiologicalStrain

    var label: String {
        switch self {
        case .missedWorkout: return "Séance ratée"
        case .overperformance: return "Surperformance"
        case .underperformance: return "Sous-performance"
        case .highFatigue: return "Fatigue élevée"
        case .injuryFlag: return "Alerte blessure"
        case .lowRecovery: return "Récupération faible"
        case .physiologicalStrain: return "Dérive cardiaque"
        }
    }
}
