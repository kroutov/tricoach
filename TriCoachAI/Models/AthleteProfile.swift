import Foundation

struct AthleteProfile: Codable, Equatable {
    var age: Int?
    var sex: Sex?
    var heightCm: Double?
    var weightKg: Double?
    var level: AthleteLevel = .beginner
    var yearsPractice: Double?
    var weeklyVolumeAvgMin: Int?
    var hrMax: Int?
    var hrRest: Int?
    var ftpWatts: Int?
    /// Seconds per km at threshold running pace.
    var thresholdPaceSecPerKm: Int?
    /// Seconds per 100m at Critical Swim Speed.
    var cssPaceSecPer100m: Int?
    var updatedAt: Date = .now

    static let empty = AthleteProfile()

    /// Heart-rate reserve (Karvonen) zone bounds, used by the plan engine
    /// to translate template intensities into personalized target HR ranges.
    func heartRateZone(_ zone: Int) -> ClosedRange<Int>? {
        guard let hrMax, let hrRest else { return nil }
        let reserve = Double(hrMax - hrRest)
        let bounds: [(Double, Double)] = [
            (0.50, 0.60), (0.60, 0.70), (0.70, 0.80), (0.80, 0.90), (0.90, 1.00),
        ]
        guard zone >= 1, zone <= bounds.count else { return nil }
        let (lowPct, highPct) = bounds[zone - 1]
        let low = Int(Double(hrRest) + reserve * lowPct)
        let high = Int(Double(hrRest) + reserve * highPct)
        return low...high
    }
}
