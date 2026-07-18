package com.tricoach.android.models

import kotlinx.serialization.Serializable

@Serializable
data class WeeklyLoadPoint(
    val weekNumber: Int,
    val startDate: String,
    val plannedLoad: Double,
    val completedLoad: Double,
)

@Serializable
data class LoadFormPoint(
    val date: String,
    val ctl: Double,
    val atl: Double,
    val tsb: Double,
)

@Serializable
data class ZonePoint(
    val intensity: WorkoutIntensity,
    val count: Int,
    val totalLoad: Double,
)

@Serializable
data class Vo2MaxPoint(
    val date: String,
    val vo2max: Double,
)

@Serializable
data class DashboardAnalytics(
    val hasActivePlan: Boolean,
    val weeklyLoad: List<WeeklyLoadPoint> = emptyList(),
    val loadForm: List<LoadFormPoint> = emptyList(),
    val zoneDistribution: List<ZonePoint> = emptyList(),
    val vo2maxTrend: List<Vo2MaxPoint> = emptyList(),
)
