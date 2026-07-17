package com.tricoach.android.models

import kotlinx.serialization.Serializable

@Serializable
data class ValueRange(
    val lowerBound: Double,
    val upperBound: Double,
)

@Serializable
data class TargetZone(
    val hrZone: Int? = null,
    val hrRangeBpm: ValueRange? = null,
    val paceSecPerKm: ValueRange? = null,
    val paceSecPer100m: ValueRange? = null,
    val powerWatts: ValueRange? = null,
    val cadence: Int? = null,
)

@Serializable
data class WorkoutSection(
    val durationMin: Int,
    val description: String,
    val target: TargetZone,
)

@Serializable
data class IntervalBlock(
    val id: String,
    val repetitions: Int,
    val workDurationSec: Int,
    val recoveryDurationSec: Int,
    val target: TargetZone,
    val note: String? = null,
)

@Serializable
data class WorkoutStructure(
    val warmup: WorkoutSection,
    val mainSet: List<IntervalBlock>,
    val cooldown: WorkoutSection,
)

@Serializable
data class Workout(
    val id: String,
    val date: String,
    val sport: SportType,
    val title: String,
    val summary: String,
    val structure: WorkoutStructure,
    val plannedDurationMin: Int,
    val plannedDistanceM: Double? = null,
    val estimatedTSS: Double? = null,
    val estimatedTRIMP: Double? = null,
    val rpeTarget: Int? = null,
    val intensity: WorkoutIntensity,
    val status: WorkoutStatus,
    val calendarEventId: String? = null,
    val isRecoveryWeek: Boolean = false,
)
