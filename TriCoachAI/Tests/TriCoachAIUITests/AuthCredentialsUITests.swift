import XCTest

final class AuthCredentialsUITests: XCTestCase {
    /// Email/password is the only auth path that reaches a real deployed
    /// backend without an Apple Developer Team — Sign In with Apple needs
    /// the paid program and `dev-login` (mode démo) is disabled outside
    /// development.
    func testRegisterReachesOnboarding() {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTestReset"]
        app.launch()

        let email = "ui-test-\(UUID().uuidString.prefix(8))@example.com"

        XCTAssertTrue(app.staticTexts["Drinking Sporting Coach"].waitForExistence(timeout: 5))
        app.buttons["Créer un compte"].tap()

        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5))
        emailField.tap()
        emailField.typeText(email)

        let passwordField = app.secureTextFields["Mot de passe"]
        XCTAssertTrue(passwordField.waitForExistence(timeout: 5))
        passwordField.tap()
        // Tapping straight from an already-focused text field into a
        // SecureField races the keyboard/focus transition — typeText can
        // land its very first character before the SecureField actually
        // takes over as first responder, silently dropping the rest. A
        // short settle delay makes the focus change land before typing.
        Thread.sleep(forTimeInterval: 0.3)
        passwordField.typeText("password123")

        let submitButton = app.buttons["authSubmitButton"]
        XCTAssertTrue(submitButton.isEnabled)
        submitButton.tap()

        XCTAssertTrue(app.staticTexts["Parlez-nous de vous"].waitForExistence(timeout: 10))
    }

    /// "Se connecter" is the default mode on a fresh launch — no need to
    /// toggle the picker first, unlike the register case above.
    func testLoginWithWrongPasswordShowsFriendlyError() {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTestReset"]
        app.launch()

        XCTAssertTrue(app.staticTexts["Drinking Sporting Coach"].waitForExistence(timeout: 5))

        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5))
        emailField.tap()
        emailField.typeText("nobody-\(UUID().uuidString.prefix(8))@example.com")

        let passwordField = app.secureTextFields["Mot de passe"]
        XCTAssertTrue(passwordField.waitForExistence(timeout: 5))
        passwordField.tap()
        Thread.sleep(forTimeInterval: 0.3)
        passwordField.typeText("wrongpassword")

        let submitButton = app.buttons["authSubmitButton"]
        XCTAssertTrue(submitButton.isEnabled)
        submitButton.tap()

        // Bumped from 10s to 20s: seen timing out on CI with the submit
        // button still disabled and its loading spinner still visible (i.e.
        // the request itself was still in flight, not a client-side bug) —
        // same cold-CI-runner tolerance already applied to other first/early
        // network calls in this suite (see AdaptationHistoryUITests).
        XCTAssertTrue(app.staticTexts["Email ou mot de passe incorrect."].waitForExistence(timeout: 20))
    }
}
