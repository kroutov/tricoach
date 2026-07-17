package com.tricoach.android.core.network

import com.tricoach.android.models.AdaptationEvent
import com.tricoach.android.models.Workout
import com.tricoach.android.models.WorkoutStatus
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

@Serializable
data class CompleteWorkoutRequest(
    val status: WorkoutStatus,
    val actualDurationMin: Int? = null,
    val rpe: Int? = null,
)

@Serializable
data class CompleteWorkoutResponse(val workout: Workout, val adaptationEvents: List<AdaptationEvent> = emptyList())

@Serializable
data class RescheduleWorkoutRequest(val date: String)

@Serializable
data class RescheduleWorkoutResponse(val workout: Workout, val conflicts: List<String> = emptyList())

interface WorkoutApi {
    @POST("workouts/{id}/complete")
    suspend fun complete(@Path("id") id: String, @Body body: CompleteWorkoutRequest): CompleteWorkoutResponse

    @PATCH("workouts/{id}")
    suspend fun reschedule(@Path("id") id: String, @Body body: RescheduleWorkoutRequest): RescheduleWorkoutResponse
}
