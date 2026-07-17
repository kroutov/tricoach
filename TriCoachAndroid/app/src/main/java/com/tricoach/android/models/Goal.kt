package com.tricoach.android.models

import kotlinx.serialization.Serializable

@Serializable
data class Goal(
    val id: String = "",
    val type: GoalType,
    val targetDate: String,
    val priority: GoalPriority,
    val targetTimeSeconds: Int? = null,
    val status: GoalStatus = GoalStatus.ACTIVE,
    val createdAt: String = "",
)
