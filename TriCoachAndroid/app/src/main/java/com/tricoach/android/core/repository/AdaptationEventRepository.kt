package com.tricoach.android.core.repository

import com.tricoach.android.core.network.ApiException
import com.tricoach.android.core.network.AppJson
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import com.tricoach.android.core.network.PlanApi
import com.tricoach.android.core.network.apiCall
import com.tricoach.android.core.persistence.AdaptationEventDao
import com.tricoach.android.core.persistence.AdaptationEventEntity
import com.tricoach.android.models.AdaptationEvent

class AdaptationEventRepository(private val api: PlanApi, private val dao: AdaptationEventDao) {
    suspend fun fetchEvents(planId: String): List<AdaptationEvent> {
        return try {
            val events = apiCall { api.fetchAdaptationEvents(planId) }
            dao.upsertAll(events.map { AdaptationEventEntity(id = it.id, planId = planId, payloadJson = AppJson.encodeToString(it)) })
            events
        } catch (e: ApiException.Network) {
            cacheRead(planId).ifEmpty { throw e }
        }
    }

    private suspend fun cacheRead(planId: String): List<AdaptationEvent> =
        dao.getByPlan(planId).mapNotNull { runCatching { AppJson.decodeFromString<AdaptationEvent>(it.payloadJson) }.getOrNull() }
}
