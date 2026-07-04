import XCTest

final class DashboardAnalyticsUITests: XCTestCase {
    func testDashboardLinksToAnalyticsScreen() {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTestReset"]
        app.launch()

        let demoButton = app.buttons["Continuer en mode démo"]
        XCTAssertTrue(demoButton.waitForExistence(timeout: 5))
        demoButton.tap()

        for _ in 0..<6 {
            let nextButton = app.buttons["Suivant"]
            XCTAssertTrue(nextButton.waitForExistence(timeout: 5))
            nextButton.tap()
        }
        let generateButton = app.buttons["Générer mon plan"]
        XCTAssertTrue(generateButton.waitForExistence(timeout: 5))
        generateButton.tap()

        XCTAssertTrue(app.tabBars.buttons["Dashboard"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Charge de la semaine"].waitForExistence(timeout: 5))

        app.buttons["Analytique complète"].tap()

        XCTAssertTrue(app.navigationBars["Analytique"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Charge hebdomadaire"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Charge chronique / aiguë (forme)"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Distribution des zones"].waitForExistence(timeout: 5))
        // A brand-new plan has no completed workouts yet.
        XCTAssertTrue(app.staticTexts["Pas encore de séances réalisées."].waitForExistence(timeout: 5))
    }
}
