package com.tricoach.android.core.network

import com.tricoach.android.models.Activity
import com.tricoach.android.models.AthleteProfile
import com.tricoach.android.models.Availability
import com.tricoach.android.models.ConstraintCheckIn
import com.tricoach.android.models.Goal
import com.tricoach.android.models.User
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.POST
import retrofit2.http.Path

@Serializable
data class UpdateUserRequest(val fullName: String? = null, val hasCompletedOnboarding: Boolean? = null)

@Serializable
data class UpdateProfileRequest(
    val age: Int? = null,
    val sex: com.tricoach.android.models.Sex? = null,
    val heightCm: Double? = null,
    val weightKg: Double? = null,
    val level: com.tricoach.android.models.AthleteLevel,
    val yearsPractice: Double? = null,
    val weeklyVolumeAvgMin: Int? = null,
    val hrMax: Int? = null,
    val hrRest: Int? = null,
    val ftpWatts: Int? = null,
    val thresholdPaceSecPerKm: Int? = null,
    val cssPaceSecPer100m: Int? = null,
)

@Serializable
data class UpdateAvailabilityRequest(
    val sessionsPerWeek: Int,
    val maxSessionDurationMin: Int,
    val availableDays: List<Int>,
    val preferredTimeSlots: List<com.tricoach.android.models.TimeSlot>,
    val mandatoryRestDays: List<Int>,
)

@Serializable
data class CreateCheckInRequest(
    val injuries: List<String> = emptyList(),
    val fatigueLevel: Int,
    val stressLevel: Int,
    val sleepHours: Double,
)

@Serializable
data class CreateGoalRequest(
    val type: com.tricoach.android.models.GoalType,
    val targetDate: String,
    val priority: com.tricoach.android.models.GoalPriority,
    val targetTimeSeconds: Int? = null,
)

@Serializable
data class CalendarTokenResponse(val token: String, val url: String)

interface UserApi {
    @GET("me")
    suspend fun fetchCurrentUser(): User

    @PUT("me")
    suspend fun updateUser(@Body body: UpdateUserRequest): User

    @GET("me/profile")
    suspend fun fetchProfile(): AthleteProfile

    @PUT("me/profile")
    suspend fun updateProfile(@Body body: UpdateProfileRequest): AthleteProfile

    @GET("me/availability")
    suspend fun fetchAvailability(): Availability

    @PUT("me/availability")
    suspend fun updateAvailability(@Body body: UpdateAvailabilityRequest): Availability

    @POST("me/constraints")
    suspend fun createCheckIn(@Body body: CreateCheckInRequest): ConstraintCheckIn

    @GET("me/goals")
    suspend fun fetchGoals(): List<Goal>

    @POST("me/goals")
    suspend fun createGoal(@Body body: CreateGoalRequest): Goal

    @PUT("me/goals/{id}")
    suspend fun updateGoal(@Path("id") id: String, @Body body: CreateGoalRequest): Goal

    @DELETE("me/goals/{id}")
    suspend fun deleteGoal(@Path("id") id: String)

    @GET("me/calendar-token")
    suspend fun fetchCalendarToken(): CalendarTokenResponse

    @POST("me/calendar-token/rotate")
    suspend fun rotateCalendarToken(): CalendarTokenResponse

    @GET("me/activities")
    suspend fun fetchActivities(): List<Activity>
}
