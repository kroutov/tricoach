package com.tricoach.android.models

import kotlinx.serialization.Serializable

@Serializable
data class Microcycle(
    val id: String,
    val weekNumber: Int,
    val startDate: String,
    val endDate: String,
    val isRecoveryWeek: Boolean = false,
    val plannedLoad: Double = 0.0,
    val workouts: List<Workout> = emptyList(),
)

@Serializable
data class Mesocycle(
    val id: String,
    val name: String,
    val focus: String,
    val loadTarget: Double? = null,
    val startDate: String,
    val endDate: String,
    val microcycles: List<Microcycle> = emptyList(),
)

@Serializable
data class Macrocycle(
    val id: String,
    val name: String,
    val phase: MacrocyclePhase,
    val startDate: String,
    val endDate: String,
    val mesocycles: List<Mesocycle> = emptyList(),
)

@Serializable
data class TrainingPlan(
    val id: String,
    val goalId: String,
    val startDate: String,
    val endDate: String,
    val durationWeeks: Int,
    val status: PlanStatus,
    val generationVersion: String = "",
    val createdAt: String = "",
    val macrocycles: List<Macrocycle> = emptyList(),
) {
    /** Flattened list of every workout across the whole plan tree — mirrors iOS TrainingPlan.allWorkouts. */
    val allWorkouts: List<Workout>
        get() = macrocycles.flatMap { it.mesocycles.flatMap { meso -> meso.microcycles.flatMap { it.workouts } } }
}
