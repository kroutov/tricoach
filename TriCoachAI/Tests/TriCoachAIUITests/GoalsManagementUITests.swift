import XCTest

final class GoalsManagementUITests: XCTestCase {
    /// Onboarding creates one goal; this exercises add → edit → delete →
    /// regenerate on top of that, all against the real local backend.
    func testAddEditDeleteGoalAndRegeneratePlan() {
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

        // Plan generation persists a full relational tree (macrocycles down
        // to workouts) server-side — seen timing out at 10s under CI load.
        XCTAssertTrue(app.tabBars.buttons["Profil"].waitForExistence(timeout: 20))
        app.tabBars.buttons["Profil"].tap()

        let manageGoalsLink = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Gérer mes objectifs")).firstMatch
        XCTAssertTrue(manageGoalsLink.waitForExistence(timeout: 5))
        manageGoalsLink.tap()

        XCTAssertTrue(app.navigationBars["Objectifs"].waitForExistence(timeout: 5))
        // The onboarding goal (Triathlon Olympique) should already be listed.
        XCTAssertTrue(app.staticTexts["Triathlon Olympique"].waitForExistence(timeout: 5))

        // Add a goal.
        app.buttons["Ajouter un objectif"].tap()
        XCTAssertTrue(app.navigationBars["Nouvel objectif"].waitForExistence(timeout: 5))
        app.buttons["Enregistrer"].tap()
        XCTAssertTrue(app.staticTexts["10 km"].waitForExistence(timeout: 5))

        // Edit → delete the newly added goal.
        app.staticTexts["10 km"].tap()
        XCTAssertTrue(app.navigationBars["Modifier l'objectif"].waitForExistence(timeout: 5))
        let deleteButton = app.buttons["Supprimer cet objectif"]
        XCTAssertTrue(deleteButton.waitForExistence(timeout: 5))
        deleteButton.tap()
        // `onDelete` awaits the network round trip before dismissing the
        // sheet (`editingGoal = nil`), so "10 km" is still legitimately on
        // screen (inside the type Picker) right after the tap — asserting
        // its absence immediately raced that in-flight request. Wait for the
        // sheet to actually dismiss (back on the "Objectifs" list) first.
        XCTAssertTrue(app.navigationBars["Objectifs"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.staticTexts["10 km"].exists)

        // Regenerate the plan from the remaining goal.
        app.buttons["Régénérer mon plan"].tap()
        XCTAssertTrue(app.staticTexts["Nouveau plan généré à partir de « Triathlon Olympique »."].waitForExistence(timeout: 10))
    }
}
