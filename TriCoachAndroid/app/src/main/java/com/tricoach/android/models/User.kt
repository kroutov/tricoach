package com.tricoach.android.models

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val appleUserId: String? = null,
    val email: String? = null,
    val fullName: String? = null,
    val createdAt: String = "",
    val hasCompletedOnboarding: Boolean = false,
    val location: String? = null,
)
