import SwiftUI

/// Semantic color palette. Built on system colors so dark mode and
/// accessibility contrast settings are respected automatically.
enum TCColor {
    static let background = Color(.systemBackground)
    static let secondaryBackground = Color(.secondarySystemBackground)
    static let cardBackground = Color(.secondarySystemGroupedBackground)
    static let primaryText = Color(.label)
    static let secondaryText = Color(.secondaryLabel)
    static let separator = Color(.separator)

    static let brand = Color.accentColor

    // Intensity — used across workout cards, zone bars, load charts.
    static let intensityEasy = Color.green
    static let intensityModerate = Color.orange
    static let intensityHard = Color.red

    // Sport identity colors.
    static let sportRun = Color.orange
    static let sportBike = Color.blue
    static let sportSwim = Color.cyan
    static let sportBrick = Color.purple
    static let sportStrength = Color.gray
    static let sportRest = Color(.systemGray4)

    static func color(for intensity: WorkoutIntensity) -> Color {
        switch intensity {
        case .easy: return intensityEasy
        case .moderate: return intensityModerate
        case .hard: return intensityHard
        }
    }

    static func color(for sport: SportType) -> Color {
        switch sport {
        case .run: return sportRun
        case .bike: return sportBike
        case .swim: return sportSwim
        case .brick: return sportBrick
        case .strength: return sportStrength
        case .rest: return sportRest
        }
    }
}
