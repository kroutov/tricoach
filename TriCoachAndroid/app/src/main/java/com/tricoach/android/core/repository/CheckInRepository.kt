package com.tricoach.android.core.repository

import com.tricoach.android.core.network.AppJson
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import com.tricoach.android.core.network.CreateCheckInRequest
import com.tricoach.android.core.network.UserApi
import com.tricoach.android.core.network.apiCall
import com.tricoach.android.core.persistence.CheckInDao
import com.tricoach.android.core.persistence.CheckInEntity
import com.tricoach.android.models.ConstraintCheckIn

/** Create-only for Phase 1 (onboarding submits one check-in) — no offline fallback needed since there's nothing to read yet. */
class CheckInRepository(private val api: UserApi, private val dao: CheckInDao) {
    suspend fun save(checkIn: ConstraintCheckIn): ConstraintCheckIn {
        val body = CreateCheckInRequest(
            injuries = checkIn.injuries,
            fatigueLevel = checkIn.fatigueLevel,
            stressLevel = checkIn.stressLevel,
            sleepHours = checkIn.sleepHours,
        )
        val saved = apiCall { api.createCheckIn(body) }
        dao.upsert(CheckInEntity(id = saved.id, payloadJson = AppJson.encodeToString(saved)))
        return saved
    }
}
