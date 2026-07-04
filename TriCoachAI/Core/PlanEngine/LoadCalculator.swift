import Foundation

/// Pure functions estimating session load. Deliberately simple, unified
/// proxies (not sport-specific TSS/NP math) so every sport contributes to
/// the same weekly load budget the periodization engine reasons about.
enum LoadCalculator {
    /// Relative intensity factor (fraction of threshold effort), used both
    /// for load estimation and for picking RPE.
    static func intensityFactor(for intensity: WorkoutIntensity) -> Double {
        switch intensity {
        case .easy: return 0.55
        case .moderate: return 0.75
        case .hard: return 0.95
        }
    }

    static func rpeTarget(for intensity: WorkoutIntensity) -> Int {
        switch intensity {
        case .easy: return 3
        case .moderate: return 6
        case .hard: return 9
        }
    }

    /// Unified load score (TSS-equivalent): duration-weighted intensity².
    /// Mirrors the standard TSS formula shape (IF² × hours × 100) so hard,
    /// short sessions and easy, long sessions can be compared on one scale.
    static func estimatedTSS(durationMin: Int, intensity: WorkoutIntensity) -> Double {
        let hours = Double(durationMin) / 60.0
        let intensityFactor = intensityFactor(for: intensity)
        return hours * intensityFactor * intensityFactor * 100
    }

    /// TRIMP (Banister), using intensity factor as a proxy for %HRR when the
    /// athlete's HR zones aren't available.
    static func estimatedTRIMP(durationMin: Int, intensity: WorkoutIntensity, sex: Sex?) -> Double {
        let factor = intensityFactor(for: intensity)
        let genderConstant = sex == .female ? 1.67 : 1.92
        return Double(durationMin) * factor * (0.64 * exp(genderConstant * factor))
    }

    /// Sums estimated TSS across a set of workouts — used as "planned load"
    /// for a microcycle and as the basis for week-over-week progression caps.
    static func totalLoad(_ workouts: [Workout]) -> Double {
        workouts.reduce(0) { $0 + ($1.estimatedTSS ?? 0) }
    }
}
