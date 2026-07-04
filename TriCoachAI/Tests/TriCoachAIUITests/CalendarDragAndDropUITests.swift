import XCTest

final class CalendarDragAndDropUITests: XCTestCase {
    /// Every weekday is made available with 7 sessions/week during onboarding
    /// (see `AdaptationHistoryUITests` for the same trick), so *every* day of
    /// the freshly generated plan's first week already has a workout —
    /// dragging one onto any other in-week day deterministically lands on an
    /// occupied day, exercising the "already occupied" conflict path.
    func testDraggingAWorkoutToAnotherOccupiedDayReschedulesItAndReportsConflict() throws {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        guard let weekInterval = calendar.dateInterval(of: .weekOfYear, for: today) else {
            throw XCTSkip("Could not compute the current calendar week.")
        }
        let weekDates = (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: weekInterval.start) }
        let planWindowEnd = calendar.date(byAdding: .day, value: 6, to: today)!
        guard let targetDate = weekDates.first(where: { $0 > today && $0 <= planWindowEnd }) else {
            throw XCTSkip("Today is the last day of the visible calendar week in this locale; no in-week drop target visible in the current week strip.")
        }

        let dayKeyFormatter = DateFormatter()
        dayKeyFormatter.dateFormat = "yyyy-MM-dd"
        let targetDayIdentifier = "calendarDay.\(dayKeyFormatter.string(from: targetDate))"

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

        XCTAssertTrue(app.staticTexts["Vos disponibilités"].waitForExistence(timeout: 5))
        for label in ["Mercredi", "Vendredi", "Dimanche"] {
            app.buttons.matching(NSPredicate(format: "label == %@", label)).firstMatch.tap()
        }
        let sessionsStepper = app.steppers.element(boundBy: 0)
        for _ in 0..<3 {
            sessionsStepper.buttons.element(boundBy: 1).tap()
        }
        app.buttons["Suivant"].tap()

        XCTAssertTrue(app.staticTexts["Contraintes actuelles"].waitForExistence(timeout: 5))
        app.buttons["Suivant"].tap()

        let generateButton = app.buttons["Générer mon plan"]
        XCTAssertTrue(generateButton.waitForExistence(timeout: 5))
        generateButton.tap()

        XCTAssertTrue(app.tabBars.buttons["Calendrier"].waitForExistence(timeout: 10))
        app.tabBars.buttons["Calendrier"].tap()
        XCTAssertTrue(app.navigationBars["Calendrier"].waitForExistence(timeout: 5))

        let sourceRow = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", " min")).firstMatch
        XCTAssertTrue(sourceRow.waitForExistence(timeout: 5))

        let targetDayCell = app.buttons[targetDayIdentifier]
        XCTAssertTrue(targetDayCell.waitForExistence(timeout: 5))

        sourceRow.press(forDuration: 0.6, thenDragTo: targetDayCell)

        XCTAssertTrue(app.alerts["Conflit détecté"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.alerts["Conflit détecté"].staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Une autre séance est déjà prévue")).firstMatch.exists)
        app.alerts["Conflit détecté"].buttons["Compris"].tap()

        // Selecting the target day now shows two workouts: the moved one and the one already there.
        targetDayCell.tap()
        let workoutsOnTargetDay = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", " min"))
        XCTAssertEqual(workoutsOnTargetDay.count, 2)
    }
}
