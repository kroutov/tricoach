import XCTest
@testable import TriCoachAI

final class LoadCalculatorTests: XCTestCase {
    func testHardSessionHasHigherLoadThanEasySessionOfSameDuration() {
        let easy = LoadCalculator.estimatedTSS(durationMin: 60, intensity: .easy)
        let moderate = LoadCalculator.estimatedTSS(durationMin: 60, intensity: .moderate)
        let hard = LoadCalculator.estimatedTSS(durationMin: 60, intensity: .hard)
        XCTAssertLessThan(easy, moderate)
        XCTAssertLessThan(moderate, hard)
    }

    func testLongerSessionHasHigherLoadAtSameIntensity() {
        let short = LoadCalculator.estimatedTSS(durationMin: 30, intensity: .moderate)
        let long = LoadCalculator.estimatedTSS(durationMin: 90, intensity: .moderate)
        XCTAssertLessThan(short, long)
    }

    func testRPETargetIncreasesWithIntensity() {
        XCTAssertLessThan(LoadCalculator.rpeTarget(for: .easy), LoadCalculator.rpeTarget(for: .moderate))
        XCTAssertLessThan(LoadCalculator.rpeTarget(for: .moderate), LoadCalculator.rpeTarget(for: .hard))
    }
}
