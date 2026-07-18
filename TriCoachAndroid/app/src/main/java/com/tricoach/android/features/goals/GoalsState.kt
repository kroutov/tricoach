package com.tricoach.android.features.goals

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.tricoach.android.app.AppContainer
import com.tricoach.android.features.onboarding.dateStringWeeksFromNow
import com.tricoach.android.models.Goal
import com.tricoach.android.models.GoalPriority
import com.tricoach.android.models.GoalType
import com.tricoach.android.models.label

/** Plain state holder (not a ViewModel) — mirrors iOS's GoalsManagementViewModel. */
class GoalsState(private val container: AppContainer) {
    var goals: List<Goal> by mutableStateOf(emptyList())
        private set
    var isLoading by mutableStateOf(true)
        private set
    var errorMessage by mutableStateOf<String?>(null)
    var isRegenerating by mutableStateOf(false)
        private set
    var regenerationMessage by mutableStateOf<String?>(null)

    suspend fun load() {
        isLoading = true
        goals = runCatching { container.goalRepository.fetchGoals() }.getOrDefault(emptyList())
        isLoading = false
    }

    /** Always reloads after saving — the server assigns a real id on creation, so the client-drafted goal's blank id must be replaced with the fetched one before it can be recognized as "known" next time. */
    suspend fun save(goal: Goal) {
        errorMessage = null
        try {
            container.goalRepository.save(goal)
            load()
        } catch (e: Exception) {
            errorMessage = "Impossible d'enregistrer l'objectif : ${e.message}"
        }
    }

    suspend fun delete(goal: Goal) {
        errorMessage = null
        try {
            container.goalRepository.delete(goal.id)
            goals = goals.filter { it.id != goal.id }
        } catch (e: Exception) {
            errorMessage = "Impossible de supprimer l'objectif : ${e.message}"
        }
    }

    /** Mirrors iOS's regeneratePlan(): priority-A goal wins, falls back to the first goal. No dedicated "regenerate" endpoint — it's the same plans/generate call used at onboarding; the server archives the prior ACTIVE plan itself. */
    suspend fun regeneratePlan() {
        val primaryGoal = goals.firstOrNull { it.priority == GoalPriority.A } ?: goals.firstOrNull()
        if (primaryGoal == null) {
            errorMessage = "Ajoutez au moins un objectif avant de générer un plan."
            return
        }
        isRegenerating = true
        errorMessage = null
        regenerationMessage = null
        try {
            container.planRepository.generatePlan(primaryGoal.id)
            regenerationMessage = "Nouveau plan généré à partir de « ${primaryGoal.type.label} »."
        } catch (e: Exception) {
            errorMessage = "Impossible de régénérer le plan : ${e.message}"
        } finally {
            isRegenerating = false
        }
    }
}

fun newDraftGoal(): Goal = Goal(type = GoalType.RUN_10K, targetDate = dateStringWeeksFromNow(8), priority = GoalPriority.B)
