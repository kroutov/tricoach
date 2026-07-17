package com.tricoach.android.core.repository

import com.tricoach.android.core.network.ApiException
import com.tricoach.android.core.network.AppJson
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import com.tricoach.android.core.network.GeneratePlanRequest
import com.tricoach.android.core.network.PlanApi
import com.tricoach.android.core.network.apiCall
import com.tricoach.android.core.persistence.TrainingPlanDao
import com.tricoach.android.core.persistence.TrainingPlanEntity
import com.tricoach.android.models.PlanStatus
import com.tricoach.android.models.TrainingPlan

class PlanRepository(private val api: PlanApi, private val dao: TrainingPlanDao) {
    /** GET /plans, filtered client-side to the one ACTIVE plan — same approach as iOS (no dedicated "active plan" endpoint). */
    suspend fun fetchActivePlan(): TrainingPlan? {
        return try {
            val plans = apiCall { api.fetchPlans() }
            val active = plans.firstOrNull { it.status == PlanStatus.ACTIVE }
            if (active != null) cacheWrite(active)
            active
        } catch (e: ApiException.Network) {
            cacheRead() ?: throw e
        }
    }

    /** No offline fallback — generating a plan is meaningless without the server. */
    suspend fun generatePlan(goalId: String, durationWeeks: Int = 12): TrainingPlan {
        val plan = apiCall { api.generatePlan(GeneratePlanRequest(goalId, durationWeeks)) }
        cacheWrite(plan)
        return plan
    }

    private suspend fun cacheWrite(plan: TrainingPlan) {
        dao.clear()
        dao.insert(TrainingPlanEntity(id = plan.id, payloadJson = AppJson.encodeToString(plan)))
    }

    private suspend fun cacheRead(): TrainingPlan? {
        val entity = dao.get() ?: return null
        return runCatching { AppJson.decodeFromString<TrainingPlan>(entity.payloadJson) }.getOrNull()
    }
}
