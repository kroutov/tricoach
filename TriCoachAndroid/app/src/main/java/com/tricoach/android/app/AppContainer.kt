package com.tricoach.android.app

import android.content.Context
import com.tricoach.android.core.auth.TokenStore
import com.tricoach.android.core.network.ApiClient
import com.tricoach.android.core.network.AuthApi
import com.tricoach.android.core.network.DashboardApi
import com.tricoach.android.core.network.PlanApi
import com.tricoach.android.core.network.UserApi
import com.tricoach.android.core.network.WorkoutApi
import com.tricoach.android.core.persistence.AppDatabase
import com.tricoach.android.core.repository.AdaptationEventRepository
import com.tricoach.android.core.repository.AuthRepository
import com.tricoach.android.core.repository.AvailabilityRepository
import com.tricoach.android.core.repository.CheckInRepository
import com.tricoach.android.core.repository.GoalRepository
import com.tricoach.android.core.repository.PlanRepository
import com.tricoach.android.core.repository.ProfileRepository
import com.tricoach.android.core.repository.UserSessionRepository
import com.tricoach.android.core.repository.WorkoutRepository

/**
 * Plain constructor-injection, no DI framework — mirrors iOS's
 * DependencyContainer exactly: one instance built at app startup, wiring
 * network clients to the repositories that wrap them.
 */
class AppContainer(context: Context) {
    private val tokenStore = TokenStore(context)
    private val database = AppDatabase.build(context)
    private val apiClient = ApiClient(tokenStore)

    private val authApi = apiClient.retrofit.create(AuthApi::class.java)
    private val userApi = apiClient.retrofit.create(UserApi::class.java)
    private val planApi = apiClient.retrofit.create(PlanApi::class.java)
    private val workoutApi = apiClient.retrofit.create(WorkoutApi::class.java)
    val dashboardApi: DashboardApi = apiClient.retrofit.create(DashboardApi::class.java)

    val userApiClient: UserApi get() = userApi

    val userSessionRepository = UserSessionRepository(database.userSessionDao())
    val authRepository = AuthRepository(authApi, tokenStore, userSessionRepository)
    val profileRepository = ProfileRepository(userApi, database.profileDao())
    val availabilityRepository = AvailabilityRepository(userApi, database.availabilityDao())
    val goalRepository = GoalRepository(userApi, database.goalDao())
    val checkInRepository = CheckInRepository(userApi, database.checkInDao())
    val planRepository = PlanRepository(planApi, database.trainingPlanDao())
    val adaptationEventRepository = AdaptationEventRepository(planApi, database.adaptationEventDao())
    val workoutRepository = WorkoutRepository(workoutApi)
}
