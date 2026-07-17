package com.tricoach.android.models

import kotlinx.serialization.Serializable

@Serializable
data class DashboardSummary(
    val hasActivePlan: Boolean,
    val planId: String? = null,
    val weekNumber: Int? = null,
    val durationWeeks: Int? = null,
    val isRecoveryWeek: Boolean = false,
    val currentPhase: MacrocyclePhase? = null,
    val weekCompletedLoad: Double = 0.0,
    val weekPlannedLoad: Double = 0.0,
    val upcomingWorkouts: List<Workout> = emptyList(),
)
