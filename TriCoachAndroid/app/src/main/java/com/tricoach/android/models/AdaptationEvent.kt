package com.tricoach.android.models

import kotlinx.serialization.Serializable

@Serializable
data class AdaptationEvent(
    val id: String,
    val planId: String,
    val triggeredBy: AdaptationTrigger,
    val actionTaken: String,
    val deltaLoadPercent: Double? = null,
    val createdAt: String = "",
)
