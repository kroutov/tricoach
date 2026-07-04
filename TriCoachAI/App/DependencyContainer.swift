import Foundation
import SwiftData

/// Simple, explicit DI: every repository/service the app needs is created
/// once here and handed to ViewModels via initializers.
///
/// Phase 2: `*Repository` properties are network-backed (`Network*Repository`),
/// each composing a SwiftData cache instance for offline reads and as a
/// fallback when the backend can't be reached — see plan §4 ("cache local
/// SwiftData... avec impl réseau + impl locale"). `PlanGenerationStrategy`
/// stays available directly for the local `SwiftDataPlanRepository`'s
/// fully-offline fallback path.
@MainActor
final class DependencyContainer {
    let modelContainer: ModelContainer

    let apiClient: APIClient
    let authAPI: AuthAPIClient
    let userAPI: UserAPI
    let workoutAPI: WorkoutAPI
    let stravaAPI: StravaAPI
    let healthKitSyncAPI: HealthKitSyncAPI
    let dashboardAPI: DashboardAPI

    let userSessionRepository: UserSessionRepository
    let profileRepository: ProfileRepository
    let goalRepository: GoalRepository
    let checkInRepository: CheckInRepository
    let planRepository: PlanRepository
    let activityRepository: ActivityRepository
    let adaptationEventRepository: AdaptationEventRepository
    let planGenerationStrategy: PlanGenerationStrategy

    init(modelContainer: ModelContainer = PersistenceContainer.make(), apiClient: APIClient = .shared) {
        self.modelContainer = modelContainer
        self.apiClient = apiClient
        let context = modelContainer.mainContext

        authAPI = AuthAPIClient(client: apiClient)
        userAPI = UserAPI(client: apiClient)
        workoutAPI = WorkoutAPI(client: apiClient)
        stravaAPI = StravaAPI(client: apiClient)
        healthKitSyncAPI = HealthKitSyncAPI(client: apiClient)
        dashboardAPI = DashboardAPI(client: apiClient)

        userSessionRepository = SwiftDataUserSessionRepository(context: context)
        activityRepository = SwiftDataActivityRepository(context: context)
        planGenerationStrategy = RuleBasedPlanStrategy()

        let profileCache = SwiftDataProfileRepository(context: context)
        let goalCache = SwiftDataGoalRepository(context: context)
        let checkInCache = SwiftDataCheckInRepository(context: context)
        let planCache = SwiftDataPlanRepository(context: context, profileRepository: profileCache, goalRepository: goalCache, planGenerationStrategy: planGenerationStrategy)
        let adaptationEventCache = SwiftDataAdaptationEventRepository(context: context)

        profileRepository = NetworkProfileRepository(client: apiClient, cache: profileCache)
        goalRepository = NetworkGoalRepository(client: apiClient, cache: goalCache)
        checkInRepository = NetworkCheckInRepository(client: apiClient, cache: checkInCache)
        planRepository = NetworkPlanRepository(client: apiClient, cache: planCache)
        adaptationEventRepository = NetworkAdaptationEventRepository(client: apiClient, cache: adaptationEventCache)
    }
}
