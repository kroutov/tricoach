package com.tricoach.android.core.repository

import com.tricoach.android.core.network.ApiException
import com.tricoach.android.core.network.AppJson
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import com.tricoach.android.core.network.UpdateProfileRequest
import com.tricoach.android.core.network.UserApi
import com.tricoach.android.core.network.apiCall
import com.tricoach.android.core.persistence.ProfileDao
import com.tricoach.android.core.persistence.ProfileEntity
import com.tricoach.android.models.AthleteProfile

/** Network-first with a Room fallback on connectivity failure only — a real error (401, validation) still propagates rather than silently serving stale data. */
class ProfileRepository(private val api: UserApi, private val dao: ProfileDao) {
    suspend fun fetch(): AthleteProfile {
        return try {
            val profile = apiCall { api.fetchProfile() }
            cacheWrite(profile)
            profile
        } catch (e: ApiException.Network) {
            cacheRead() ?: throw e
        }
    }

    suspend fun save(profile: AthleteProfile): AthleteProfile {
        val body = UpdateProfileRequest(
            age = profile.age,
            sex = profile.sex,
            heightCm = profile.heightCm,
            weightKg = profile.weightKg,
            level = profile.level,
            yearsPractice = profile.yearsPractice,
            weeklyVolumeAvgMin = profile.weeklyVolumeAvgMin,
            hrMax = profile.hrMax,
            hrRest = profile.hrRest,
            ftpWatts = profile.ftpWatts,
            thresholdPaceSecPerKm = profile.thresholdPaceSecPerKm,
            cssPaceSecPer100m = profile.cssPaceSecPer100m,
        )
        val saved = apiCall { api.updateProfile(body) }
        cacheWrite(saved)
        return saved
    }

    private suspend fun cacheWrite(profile: AthleteProfile) {
        dao.clear()
        dao.insert(ProfileEntity(id = "profile", payloadJson = AppJson.encodeToString(profile)))
    }

    private suspend fun cacheRead(): AthleteProfile? {
        val entity = dao.get() ?: return null
        return runCatching { AppJson.decodeFromString<AthleteProfile>(entity.payloadJson) }.getOrNull()
    }
}
