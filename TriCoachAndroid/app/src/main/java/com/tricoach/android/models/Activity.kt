package com.tricoach.android.models

import kotlinx.serialization.Serializable

/** Mirrors the backend's serializeActivity (tricoach-backend/src/modules/me/serializers.ts) — a synced activity from any source, not necessarily matched to a planned Workout. */
@Serializable
data class Activity(
    val id: String,
    val workoutId: String? = null,
    val source: ActivitySource,
    val sport: SportType? = null,
    val startTime: String,
    val durationS: Int,
    val distanceM: Double? = null,
    val avgHr: Int? = null,
    val maxHr: Int? = null,
    val avgPowerWatts: Int? = null,
    val avgPaceSecPerKm: Int? = null,
    val elevationGainM: Double? = null,
)
