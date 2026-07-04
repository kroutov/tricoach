import Foundation

struct HealthMetricsDaily: Codable, Equatable, Identifiable {
    var id: UUID = UUID()
    var date: Date
    var restingHr: Int?
    var hrvMs: Double?
    var vo2max: Double?
    var sleepDurationMin: Int?
    var sleepQuality: Int?
    /// Acute training load (~7-day exponentially weighted TSS/TRIMP).
    var trainingLoadAcute: Double?
    /// Chronic training load (~28-day exponentially weighted TSS/TRIMP).
    var trainingLoadChronic: Double?
    var formScore: Double?

    /// Acute:Chronic Workload Ratio — >1.5 flags injury/overtraining risk.
    var acwr: Double? {
        guard let trainingLoadAcute, let trainingLoadChronic, trainingLoadChronic > 0 else { return nil }
        return trainingLoadAcute / trainingLoadChronic
    }
}
