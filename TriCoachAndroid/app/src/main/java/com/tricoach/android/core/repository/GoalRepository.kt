package com.tricoach.android.core.repository

import com.tricoach.android.core.network.ApiException
import com.tricoach.android.core.network.AppJson
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import com.tricoach.android.core.network.CreateGoalRequest
import com.tricoach.android.core.network.UserApi
import com.tricoach.android.core.network.apiCall
import com.tricoach.android.core.persistence.GoalDao
import com.tricoach.android.core.persistence.GoalEntity
import com.tricoach.android.models.Goal

class GoalRepository(private val api: UserApi, private val dao: GoalDao) {
    suspend fun fetchGoals(): List<Goal> {
        return try {
            val goals = apiCall { api.fetchGoals() }
            cacheWrite(goals)
            goals
        } catch (e: ApiException.Network) {
            cacheRead().ifEmpty { throw e }
        }
    }

    /** Creates a new goal when [goal.id] is blank (not yet assigned by the server), otherwise updates the existing one — mirrors iOS's GoalRepository.save. */
    suspend fun save(goal: Goal): Goal {
        val body = CreateGoalRequest(
            type = goal.type,
            targetDate = goal.targetDate,
            priority = goal.priority,
            targetTimeSeconds = goal.targetTimeSeconds,
        )
        val saved = if (goal.id.isBlank()) {
            apiCall { api.createGoal(body) }
        } else {
            apiCall { api.updateGoal(goal.id, body) }
        }
        dao.upsert(GoalEntity(id = saved.id, payloadJson = AppJson.encodeToString(saved)))
        return saved
    }

    suspend fun delete(id: String) {
        apiCall { api.deleteGoal(id) }
    }

    private suspend fun cacheWrite(goals: List<Goal>) {
        dao.clear()
        dao.upsertAll(goals.map { GoalEntity(id = it.id, payloadJson = AppJson.encodeToString(it)) })
    }

    private suspend fun cacheRead(): List<Goal> =
        dao.getAll().mapNotNull { runCatching { AppJson.decodeFromString<Goal>(it.payloadJson) }.getOrNull() }
}
