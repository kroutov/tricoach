package com.tricoach.android.core.network

import com.tricoach.android.models.AdaptationEvent
import com.tricoach.android.models.TrainingPlan
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

@Serializable
data class GeneratePlanRequest(val goalId: String, val durationWeeks: Int = 12)

interface PlanApi {
    @POST("plans/generate")
    suspend fun generatePlan(@Body body: GeneratePlanRequest): TrainingPlan

    @GET("plans")
    suspend fun fetchPlans(): List<TrainingPlan>

    @GET("plans/{id}")
    suspend fun fetchPlan(@Path("id") id: String): TrainingPlan

    @GET("plans/{id}/adaptation-events")
    suspend fun fetchAdaptationEvents(@Path("id") planId: String): List<AdaptationEvent>
}
