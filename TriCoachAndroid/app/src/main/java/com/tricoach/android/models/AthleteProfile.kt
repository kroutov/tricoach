package com.tricoach.android.models

import kotlinx.serialization.Serializable

@Serializable
data class AthleteProfile(
    val age: Int? = null,
    val sex: Sex? = null,
    val heightCm: Double? = null,
    val weightKg: Double? = null,
    val level: AthleteLevel = AthleteLevel.BEGINNER,
    val yearsPractice: Double? = null,
    val weeklyVolumeAvgMin: Int? = null,
    val hrMax: Int? = null,
    val hrRest: Int? = null,
    val ftpWatts: Int? = null,
    val thresholdPaceSecPerKm: Int? = null,
    val cssPaceSecPer100m: Int? = null,
    val updatedAt: String = "",
) {
    companion object {
        val empty = AthleteProfile()
    }
}
