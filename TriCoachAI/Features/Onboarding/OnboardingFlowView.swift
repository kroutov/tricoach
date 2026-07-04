import SwiftUI

struct OnboardingFlowView: View {
    let container: DependencyContainer
    var onFinished: (TrainingPlan?) -> Void

    @State private var viewModel: OnboardingViewModel

    init(container: DependencyContainer, onFinished: @escaping (TrainingPlan?) -> Void) {
        self.container = container
        self.onFinished = onFinished
        _viewModel = State(initialValue: OnboardingViewModel(container: container))
    }

    var body: some View {
        VStack(spacing: 0) {
            ProgressView(value: viewModel.progress)
                .tint(TCColor.brand)
                .padding(.horizontal, TCSpacing.md)
                .padding(.top, TCSpacing.sm)

            Text(viewModel.currentStep.title)
                .font(TCFont.caption)
                .foregroundStyle(TCColor.secondaryText)
                .padding(.top, TCSpacing.xs)

            ScrollView {
                stepContent
                    .padding(TCSpacing.md)
                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                        .font(TCFont.caption)
                        .foregroundStyle(.red)
                        .padding(.horizontal, TCSpacing.md)
                }
            }

            navigationBar
        }
        .background(TCColor.background)
    }

    @ViewBuilder
    private var stepContent: some View {
        switch viewModel.currentStep {
        case .personalInfo: PersonalInfoStepView(profile: $viewModel.profile)
        case .sportLevel: SportLevelStepView(profile: $viewModel.profile)
        case .history: HistoryStepView(profile: $viewModel.profile)
        case .goals: GoalsStepView(viewModel: viewModel)
        case .availability: AvailabilityStepView(availability: $viewModel.availability)
        case .constraints: ConstraintsStepView(checkIn: $viewModel.checkIn)
        case .summary: OnboardingSummaryStepView(viewModel: viewModel)
        }
    }

    private var navigationBar: some View {
        HStack(spacing: TCSpacing.md) {
            if viewModel.stepIndex > 0 {
                Button("Retour") { viewModel.goBack() }
                    .foregroundStyle(TCColor.secondaryText)
            }
            Spacer()
            if viewModel.currentStep == .summary {
                Button {
                    Task {
                        let plan = await viewModel.finishOnboarding()
                        if plan != nil { onFinished(plan) }
                    }
                } label: {
                    if viewModel.isGenerating {
                        ProgressView().tint(.white)
                    } else {
                        Text("Générer mon plan")
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: 220)
                .disabled(viewModel.isGenerating)
            } else {
                Button("Suivant") { viewModel.goNext() }
                    .buttonStyle(PrimaryButtonStyle())
                    .frame(maxWidth: 160)
                    .disabled(!viewModel.canGoNext)
            }
        }
        .padding(TCSpacing.md)
        .background(TCColor.secondaryBackground)
    }
}
