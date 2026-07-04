import XCTest

final class AdaptationHistoryUITests: XCTestCase {
    /// Logs an injury during onboarding (which deterministically produces an
    /// `injuryFlag` adaptation event on the very next plan re-evaluation,
    /// regardless of which specific workout gets skipped — see
    /// `evaluateAdaptation` in the backend), then skips a workout to trigger
    /// that re-evaluation, and verifies the event surfaces both on the
    /// Dashboard and in the full history screen.
    func testSkippedWorkoutAdaptationEventAppearsInHistory() {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTestReset"]
        app.launch()

        let demoButton = app.buttons["Continuer en mode démo"]
        XCTAssertTrue(demoButton.waitForExistence(timeout: 5))
        demoButton.tap()

        // personalInfo -> sportLevel -> history -> goals
        for _ in 0..<4 {
            let nextButton = app.buttons["Suivant"]
            XCTAssertTrue(nextButton.waitForExistence(timeout: 5))
            nextButton.tap()
        }

        // Availability step: make every weekday available and bump sessions
        // to 7/week, so the generated plan always has a workout scheduled
        // for "today" — independent of which weekday the test runs on.
        XCTAssertTrue(app.staticTexts["Vos disponibilités"].waitForExistence(timeout: 5))
        for label in ["Mercredi", "Vendredi", "Dimanche"] {
            app.buttons.matching(NSPredicate(format: "label == %@", label)).firstMatch.tap()
        }
        let sessionsStepper = app.steppers.element(boundBy: 0)
        for _ in 0..<3 {
            sessionsStepper.buttons.element(boundBy: 1).tap()
        }
        app.buttons["Suivant"].tap()

        // Constraints step: log an injury.
        XCTAssertTrue(app.staticTexts["Contraintes actuelles"].waitForExistence(timeout: 5))
        let injuryField = app.textFields["Ex : douleur genou droit"]
        XCTAssertTrue(injuryField.waitForExistence(timeout: 5))
        injuryField.tap()
        injuryField.typeText("Douleur genou droit")
        app.buttons["Ajouter"].tap()
        app.buttons["Suivant"].tap()

        let generateButton = app.buttons["Générer mon plan"]
        XCTAssertTrue(generateButton.waitForExistence(timeout: 5))
        generateButton.tap()

        XCTAssertTrue(app.tabBars.buttons["Calendrier"].waitForExistence(timeout: 10))
        app.tabBars.buttons["Calendrier"].tap()
        XCTAssertTrue(app.navigationBars["Calendrier"].waitForExistence(timeout: 5))

        // Today has a workout now (every day is available) — open it and
        // mark it as missed, which re-evaluates the plan server-side.
        let workoutRow = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", " min")).firstMatch
        XCTAssertTrue(workoutRow.waitForExistence(timeout: 5))
        workoutRow.tap()

        let skipButton = app.buttons["Marquer comme ratée"]
        XCTAssertTrue(skipButton.waitForExistence(timeout: 5))
        skipButton.tap()

        // Wait for the server round-trip (button re-enables / status pill flips) before navigating away.
        XCTAssertTrue(app.staticTexts["Ratée"].waitForExistence(timeout: 10))

        app.tabBars.buttons["Dashboard"].tap()
        XCTAssertTrue(app.navigationBars["Dashboard"].waitForExistence(timeout: 5))

        let historyLink = app.buttons["Voir tout l'historique"]
        XCTAssertTrue(historyLink.waitForExistence(timeout: 10))
        historyLink.tap()

        XCTAssertTrue(app.navigationBars["Historique d'adaptation"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Alerte blessure"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Douleur genou droit")).firstMatch.waitForExistence(timeout: 5))
    }
}
