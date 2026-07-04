import AuthenticationServices
import SwiftUI

struct AuthView: View {
    let container: DependencyContainer
    var onSignedIn: (User) -> Void

    @State private var viewModel: AuthViewModel

    init(container: DependencyContainer, onSignedIn: @escaping (User) -> Void) {
        self.container = container
        self.onSignedIn = onSignedIn
        _viewModel = State(initialValue: AuthViewModel(authAPI: container.authAPI))
    }

    var body: some View {
        VStack(spacing: TCSpacing.lg) {
            Spacer()

            VStack(spacing: TCSpacing.sm) {
                Image(systemName: "figure.run")
                    .font(.system(size: 56))
                    .foregroundStyle(TCColor.brand)
                Text("TriCoach AI")
                    .font(TCFont.largeTitle)
                Text("Votre coach adaptatif pour la course, le vélo, la natation et le triathlon.")
                    .font(TCFont.subheadline)
                    .foregroundStyle(TCColor.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, TCSpacing.lg)
            }

            Spacer()

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
            .padding(.horizontal, TCSpacing.lg)
            .padding(.bottom, TCSpacing.xl)
        }
        .background(TCColor.background)
    }
}

#Preview {
    AuthView(container: DependencyContainer(modelContainer: PersistenceContainer.make(inMemory: true)), onSignedIn: { _ in })
}
