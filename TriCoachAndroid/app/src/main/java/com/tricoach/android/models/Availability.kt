package com.tricoach.android.models

import kotlinx.serialization.Serializable

/** Calendar-style weekday numbering used throughout the API: Sunday=1 ... Saturday=7. */
@Serializable
data class Availability(
    val sessionsPerWeek: Int = 4,
    val maxSessionDurationMin: Int = 90,
    val availableDays: List<Int> = listOf(2, 3, 5, 7),
    val preferredTimeSlots: List<TimeSlot> = listOf(TimeSlot.EVENING),
    val mandatoryRestDays: List<Int> = listOf(1),
    val updatedAt: String = "",
)
