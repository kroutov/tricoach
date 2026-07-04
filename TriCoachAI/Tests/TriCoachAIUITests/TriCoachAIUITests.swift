import XCTest

final class TriCoachAIUITests: XCTestCase {
    func testAppLaunches() {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTestReset"]
        app.launch()
        XCTAssertTrue(app.staticTexts["TriCoach AI"].waitForExistence(timeout: 5))
    }
}
