package com.tricoach.android.models

import kotlinx.serialization.Serializable

@Serializable
data class ConstraintCheckIn(
    val id: String = "",
    val date: String = "",
    val injuries: List<String> = emptyList(),
    val fatigueLevel: Int = 2,
    val stressLevel: Int = 2,
    val sleepHours: Double = 7.5,
)
