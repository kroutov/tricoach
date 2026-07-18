package com.tricoach.android.core.network

import com.tricoach.android.models.AdaptationEvent
import com.tricoach.android.models.SportType
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST

@Serializable
data class AuthUrlResponse(val url: String)

@Serializable
data class StravaStatusResponse(val connected: Boolean, val connectedAt: String? = null)

@Serializable
data class IntegrationSyncResult(val activitiesIngested: Int, val adaptationEvents: List<AdaptationEvent> = emptyList())

/** Mirrors the backend's `activitySchema` (tricoach-backend/src/modules/integrations/healthkit.ts) — same shape iOS's HealthKit sync sends, `source` just differs. */
@Serializable
data class HealthActivitySync(
    val source: String,
    val externalId: String? = null,
    val startTime: String,
    val durationS: Int,
    val distanceM: Double? = null,
    val avgHr: Int? = null,
    val maxHr: Int? = null,
    val avgPowerWatts: Int? = null,
    val avgPaceSecPerKm: Int? = null,
    val elevationGainM: Double? = null,
    val sport: SportType,
)

/** Mirrors the backend's `healthMetricSchema`. */
@Serializable
data class HealthMetricSync(
    val date: String,
    val restingHr: Int? = null,
    val hrvMs: Double? = null,
    val vo2max: Double? = null,
    val sleepDurationMin: Int? = null,
    val sleepQuality: Int? = null,
)

@Serializable
data class HealthSyncRequest(
    val activities: List<HealthActivitySync> = emptyList(),
    val healthMetrics: List<HealthMetricSync> = emptyList(),
)

interface IntegrationsApi {
    @GET("integrations/strava/auth-url")
    suspend fun stravaAuthUrl(): AuthUrlResponse

    @GET("integrations/strava/status")
    suspend fun stravaStatus(): StravaStatusResponse

    @DELETE("integrations/strava")
    suspend fun disconnectStrava()

    @POST("integrations/strava/sync")
    suspend fun syncStrava(): IntegrationSyncResult

    @POST("integrations/healthkit/sync")
    suspend fun syncHealthMetrics(@Body body: HealthSyncRequest): IntegrationSyncResult
}
