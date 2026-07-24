import XCTest

final class OnboardingFlowUITests: XCTestCase {
    /// End-to-end smoke test for Phase 1's core promise: from a fresh
    /// install, a demo user can complete onboarding and land on a generated
    /// plan without any backend or network dependency.
    func testOnboardingFlowGeneratesPlanAndReachesDashboard() {
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

        app.tabBars.buttons["Calendrier"].tap()
        XCTAssertTrue(app.navigationBars["Calendrier"].waitForExistence(timeout: 5))

        app.tabBars.buttons["Profil"].tap()
        XCTAssertTrue(app.navigationBars["Profil"].waitForExistence(timeout: 5))

        // "Se déconnecter" sits below several integration rows — the List doesn't keep
        // off-screen rows in the accessibility tree, so scroll it into view first.
        let signOutButton = app.buttons["Se déconnecter"]
        for _ in 0..<10 where !signOutButton.exists {
            app.swipeUp()
        }
        XCTAssertTrue(signOutButton.waitForExistence(timeout: 5))
    }
}
