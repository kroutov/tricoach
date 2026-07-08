import AuthenticationServices
import SwiftUI

struct AuthView: View {
    let container: DependencyContainer
    var onSignedIn: (User) -> Void

    @State private var viewModel: AuthViewModel
    @State private var mode: CredentialsMode = .login
    @State private var email = ""
    @State private var password = ""
    @State private var fullName = ""

    private enum CredentialsMode: String, CaseIterable {
        case login, register

        var label: String {
            switch self {
            case .login: return "Se connecter"
            case .register: return "Créer un compte"
            }
        }
    }

    init(container: DependencyContainer, onSignedIn: @escaping (User) -> Void) {
        self.container = container
        self.onSignedIn = onSignedIn
        _viewModel = State(initialValue: AuthViewModel(authAPI: container.authAPI))
    }

    private var isEmailValid: Bool {
        email.contains("@") && email.split(separator: "@").last?.contains(".") == true
    }

    private var isPasswordValid: Bool {
        mode == .login ? !password.isEmpty : password.count >= 8
    }

    private var canSubmitCredentials: Bool {
        isEmailValid && isPasswordValid && !viewModel.isLoading
    }

    var body: some View {
        ScrollView {
            VStack(spacing: TCSpacing.lg) {
                VStack(spacing: TCSpacing.sm) {
                    Image(systemName: "figure.run")
                        .font(.system(size: 56))
                        .foregroundStyle(TCColor.brand)
                    Text("Drinking Sporting Coach")
                        .font(TCFont.largeTitle)
                    Text("Votre coach adaptatif pour la course, le vélo, la natation et le triathlon.")
                        .font(TCFont.subheadline)
                        .foregroundStyle(TCColor.secondaryText)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, TCSpacing.lg)
                }
                .padding(.top, TCSpacing.xl)

                VStack(spacing: TCSpacing.md) {
                    Picker("Mode", selection: $mode) {
                        ForEach(CredentialsMode.allCases, id: \.self) { mode in
                            Text(mode.label).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)

                    if mode == .register {
                        AuthTextField(placeholder: "Nom complet (optionnel)", text: $fullName, textContentType: .name)
                    }
                    AuthTextField(placeholder: "Email", text: $email, keyboardType: .emailAddress, textContentType: .emailAddress)
                    AuthTextField(placeholder: "Mot de passe", text: $password, isSecure: true, textContentType: .password)

                    if mode == .register, !password.isEmpty, !isPasswordValid {
                        Text("Le mot de passe doit contenir au moins 8 caractères.")
                            .font(TCFont.caption)
                            .foregroundStyle(TCColor.secondaryText)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Button(mode.label) {
                        Task {
                            let user = switch mode {
                            case .login: await viewModel.login(email: email, password: password)
                            case .register: await viewModel.register(email: email, password: password, fullName: fullName)
                            }
                            if let user { onSignedIn(user) }
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(!canSubmitCredentials)
                    .accessibilityIdentifier("authSubmitButton")
                }

                HStack {
                    Rectangle().fill(TCColor.separator).frame(height: 1)
                    Text("ou").font(TCFont.caption).foregroundStyle(TCColor.secondaryText)
                    Rectangle().fill(TCColor.separator).frame(height: 1)
                }

                VStack(spacing: TCSpacing.sm) {
                    SignInWithAppleButton(.signIn) { request in
                        request.requestedScopes = [.fullName, .email]
                    } onCompletion: { result in
                        Task {
                            if let user = await viewModel.handleAppleSignIn(result: result) {
                                onSignedIn(user)
                            }
                        }
                    }
                    .signInWithAppleButtonStyle(.black)
                    .frame(height: 50)
                    .clipShape(RoundedRectangle(cornerRadius: TCRadius.control, style: .continuous))
                    .disabled(viewModel.isLoading)

                    // Real users authenticate with Apple or email/password —
                    // this stays reachable only for the automated UI test
                    // suite (same `-uiTestReset` flag `TriCoachAIApp` uses to
                    // start from a clean store), so those tests don't all
                    // need rewriting to register a throwaway account instead.
                    if ProcessInfo.processInfo.arguments.contains("-uiTestReset") {
                        Button("Continuer en mode démo") {
                            Task {
                                if let user = await viewModel.continueAsDemoUser() {
                                    onSignedIn(user)
                                }
                            }
                        }
                        .font(TCFont.subheadline)
                        .foregroundStyle(TCColor.secondaryText)
                        .disabled(viewModel.isLoading)
                    }

                    if viewModel.isLoading {
                        ProgressView()
                    }

                    if let errorMessage = viewModel.errorMessage {
                        Text(errorMessage)
                            .font(TCFont.caption)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.bottom, TCSpacing.xl)
            }
            .padding(.horizontal, TCSpacing.lg)
        }
        .background(TCColor.background)
    }
}

private struct AuthTextField: View {
    let placeholder: String
    @Binding var text: String
    var isSecure: Bool = false
    var keyboardType: UIKeyboardType = .default
    var textContentType: UITextContentType?

    var body: some View {
        Group {
            if isSecure {
                SecureField(placeholder, text: $text)
            } else {
                TextField(placeholder, text: $text)
                    .keyboardType(keyboardType)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }
        }
        .textContentType(textContentType)
        .padding(TCSpacing.sm)
        .background(TCColor.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: TCRadius.control, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: TCRadius.control, style: .continuous)
                .stroke(TCColor.separator, lineWidth: 1)
        )
    }
}

#Preview {
    AuthView(container: DependencyContainer(modelContainer: PersistenceContainer.make(inMemory: true)), onSignedIn: { _ in })
}
