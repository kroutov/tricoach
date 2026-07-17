package com.tricoach.android.core.repository

import com.tricoach.android.core.network.ApiException
import com.tricoach.android.core.network.AppJson
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import com.tricoach.android.core.network.UpdateAvailabilityRequest
import com.tricoach.android.core.network.UserApi
import com.tricoach.android.core.network.apiCall
import com.tricoach.android.core.persistence.AvailabilityDao
import com.tricoach.android.core.persistence.AvailabilityEntity
import com.tricoach.android.models.Availability

class AvailabilityRepository(private val api: UserApi, private val dao: AvailabilityDao) {
    suspend fun fetch(): Availability {
        return try {
            val availability = apiCall { api.fetchAvailability() }
            cacheWrite(availability)
            availability
        } catch (e: ApiException.Network) {
            cacheRead() ?: throw e
        }
    }

    suspend fun save(availability: Availability): Availability {
        val body = UpdateAvailabilityRequest(
            sessionsPerWeek = availability.sessionsPerWeek,
            maxSessionDurationMin = availability.maxSessionDurationMin,
            availableDays = availability.availableDays,
            preferredTimeSlots = availability.preferredTimeSlots,
            mandatoryRestDays = availability.mandatoryRestDays,
        )
        val saved = apiCall { api.updateAvailability(body) }
        cacheWrite(saved)
        return saved
    }

    private suspend fun cacheWrite(availability: Availability) {
        dao.clear()
        dao.insert(AvailabilityEntity(id = "availability", payloadJson = AppJson.encodeToString(availability)))
    }

    private suspend fun cacheRead(): Availability? {
        val entity = dao.get() ?: return null
        return runCatching { AppJson.decodeFromString<Availability>(entity.payloadJson) }.getOrNull()
    }
}
