import Foundation
import Observation

@MainActor
@Observable
final class OnboardingViewModel {
    enum Step: Int, CaseIterable {
        case personalInfo, sportLevel, history, goals, availability, constraints, summary

        var title: String {
            switch self {
            case .personalInfo: return "Vous"
            case .sportLevel: return "Niveau"
            case .history: return "Historique"
            case .goals: return "Objectifs"
            case .availability: return "Disponibilités"
            case .constraints: return "Contraintes"
            case .summary: return "Résumé"
            }
        }
    }

    var stepIndex = 0
    var profile = AthleteProfile.empty
    var goals: [Goal] = [
        Goal(type: .triathlonOlympic, targetDate: Calendar.current.date(byAdding: .weekOfYear, value: 12, to: .now) ?? .now, priority: .a),
    ]
    var availability = Availability.default
    var checkIn = ConstraintCheckIn()

    private(set) var generatedPlan: TrainingPlan?
    var isGenerating = false
    var errorMessage: String?

    private let profileRepository: ProfileRepository
    private let goalRepository: GoalRepository
    private let checkInRepository: CheckInRepository
    private let planRepository: PlanRepository

    init(container: DependencyContainer) {
        profileRepository = container.profileRepository
        goalRepository = container.goalRepository
        checkInRepository = container.checkInRepository
        planRepository = container.planRepository
    }

    var currentStep: Step { Step(rawValue: stepIndex) ?? .summary }
    var progress: Double { Double(stepIndex + 1) / Double(Step.allCases.count) }

    var canGoNext: Bool {
        switch currentStep {
        case .goals: return !goals.isEmpty
        case .availability: return !availability.availableDays.isEmpty && availability.sessionsPerWeek > 0
        default: return true
        }
    }

    func goNext() {
        guard canGoNext, stepIndex < Step.allCases.count - 1 else { return }
        stepIndex += 1
    }

    func goBack() {
        guard stepIndex > 0 else { return }
        stepIndex -= 1
    }

    func addGoal() {
        goals.append(Goal(type: .run10k, targetDate: Calendar.current.date(byAdding: .weekOfYear, value: 8, to: .now) ?? .now, priority: .b))
    }

    func removeGoals(at offsets: IndexSet) {
        goals.remove(atOffsets: offsets)
    }

    @discardableResult
    func finishOnboarding() async -> TrainingPlan? {
        isGenerating = true
        errorMessage = nil
        defer { isGenerating = false }

        do {
            try await profileRepository.save(profile)
            try await profileRepository.save(availability)
            try await checkInRepository.save(checkIn)
            for goal in goals {
                try await goalRepository.save(goal)
            }

            // The server assigns real ids on creation, so re-fetch rather
            // than reuse the client-drafted `goals` array's local UUIDs.
            let savedGoals = try await goalRepository.fetchGoals()
            guard let primaryGoal = savedGoals.first(where: { $0.priority == .a }) ?? savedGoals.first else {
                errorMessage = "Aucun objectif enregistré."
                return nil
            }

            let plan = try await planRepository.generatePlan(goalId: primaryGoal.id, durationWeeks: nil)
            generatedPlan = plan
            return plan
        } catch {
            errorMessage = "Impossible de générer le plan : \(error.localizedDescription)"
            return nil
        }
    }
}
