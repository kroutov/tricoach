import XCTest
@testable import TriCoachAI

final class PeriodizationEngineTests: XCTestCase {
    func testPhaseWeeksSumToTotalWeeks() {
        for goal in GoalType.allCases {
            for totalWeeks in [4, 8, 12, 16, 24] {
                let phases = PeriodizationEngine.allocatePhases(totalWeeks: totalWeeks, goalType: goal)
                let sum = phases.reduce(0) { $0 + $1.weeks }
                XCTAssertEqual(sum, totalWeeks, "\(goal) over \(totalWeeks) weeks should allocate every week")
            }
        }
    }

    func testIronmanTapersLongerThan10K() {
        let ironmanTaper = PeriodizationEngine.taperWeeks(for: .ironman, totalWeeks: 24)
        let tenKTaper = PeriodizationEngine.taperWeeks(for: .run10k, totalWeeks: 8)
        XCTAssertGreaterThan(ironmanTaper, tenKTaper)
    }

    func testVeryShortPlanIsSinglePeakPhase() {
        let phases = PeriodizationEngine.allocatePhases(totalWeeks: 3, goalType: .run10k)
        XCTAssertEqual(phases.count, 1)
        XCTAssertEqual(phases.first?.phase, .peak)
        XCTAssertEqual(phases.first?.weeks, 3)
    }

    func testLongPlanIncludesAllFourPhases() {
        let phases = PeriodizationEngine.allocatePhases(totalWeeks: 16, goalType: .marathon)
        let phaseTypes = Set(phases.map(\.phase))
        XCTAssertEqual(phaseTypes, [.base, .build, .peak, .taper])
    }

    func testMacrocyclesAreContiguousAndOrdered() {
        let start = Date()
        let macrocycles = PeriodizationEngine.buildMacrocycles(totalWeeks: 12, goalType: .triathlonOlympic, startDate: start)
        XCTAssertFalse(macrocycles.isEmpty)
        for (a, b) in zip(macrocycles, macrocycles.dropFirst()) {
            let expectedNextStart = Calendar.current.date(byAdding: .day, value: 1, to: a.endDate)
            XCTAssertEqual(Calendar.current.startOfDay(for: b.startDate), Calendar.current.startOfDay(for: expectedNextStart!))
        }
    }
}
