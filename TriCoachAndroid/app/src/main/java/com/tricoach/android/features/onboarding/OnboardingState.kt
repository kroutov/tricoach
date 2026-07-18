package com.tricoach.android.features.onboarding

import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.res.stringResource
import com.tricoach.android.R
import com.tricoach.android.app.AppContainer
import com.tricoach.android.models.AthleteProfile
import com.tricoach.android.models.Availability
import com.tricoach.android.models.ConstraintCheckIn
import com.tricoach.android.models.Goal
import com.tricoach.android.models.GoalPriority
import com.tricoach.android.models.GoalType

enum class OnboardingStep(@StringRes val titleResId: Int) {
    PERSONAL_INFO(R.string.onboarding_step_title_personal_info),
    SPORT_LEVEL(R.string.onboarding_step_title_sport_level),
    HISTORY(R.string.onboarding_step_title_history),
    GOALS(R.string.onboarding_step_title_goals),
    AVAILABILITY(R.string.onboarding_step_title_availability),
    CONSTRAINTS(R.string.onboarding_step_title_constraints),
    SUMMARY(R.string.onboarding_step_title_summary),
}

val OnboardingStep.title: String
    @Composable get() = stringResource(titleResId)

/** Plain state holder (not a ViewModel) — mirrors iOS's OnboardingViewModel, owned once by OnboardingFlowScreen via remember. */
class OnboardingState(private val container: AppContainer) {
    var stepIndex by mutableStateOf(0)
        private set

    var profile by mutableStateOf(AthleteProfile.empty)
    val goals = mutableStateListOf(defaultGoal(GoalType.TRIATHLON_OLYMPIC, weeks = 12, priority = GoalPriority.A))
    var availability by mutableStateOf(Availability())
    var checkIn by mutableStateOf(ConstraintCheckIn())

    var isGenerating by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set

    val currentStep: OnboardingStep get() = OnboardingStep.entries[stepIndex]
    val progress: Float get() = (stepIndex + 1) / OnboardingStep.entries.size.toFloat()

    val canGoNext: Boolean
        get() = when (currentStep) {
            OnboardingStep.GOALS -> goals.isNotEmpty()
            OnboardingStep.AVAILABILITY -> availability.availableDays.isNotEmpty() && availability.sessionsPerWeek > 0
            else -> true
        }

    fun goNext() {
        if (canGoNext && stepIndex < OnboardingStep.entries.size - 1) stepIndex++
    }

    fun goBack() {
        if (stepIndex > 0) stepIndex--
    }

    fun updateGoal(index: Int, goal: Goal) {
        goals[index] = goal
    }

    fun addGoal() {
        goals.add(defaultGoal(GoalType.RUN_10K, weeks = 8, priority = GoalPriority.B))
    }

    fun removeGoal(index: Int) {
        goals.removeAt(index)
    }

    /** Mirrors OnboardingViewModel.finishOnboarding(): save everything, then generate the plan from the priority-A goal. */
    suspend fun finishOnboarding(): Boolean {
        isGenerating = true
        errorMessage = null
        try {
            container.profileRepository.save(profile)
            container.availabilityRepository.save(availability)
            container.checkInRepository.save(checkIn)
            for (goal in goals) {
                container.goalRepository.save(goal)
            }

            // The server assigns real ids on creation, so re-fetch rather than reuse the client-drafted goals' blank ids.
            val savedGoals = container.goalRepository.fetchGoals()
            val primaryGoal = savedGoals.firstOrNull { it.priority == GoalPriority.A } ?: savedGoals.firstOrNull()
            if (primaryGoal == null) {
                errorMessage = container.context.getString(R.string.error_onboarding_no_goal_saved)
                return false
            }

            container.planRepository.generatePlan(primaryGoal.id)
            return true
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.error_onboarding_generate_plan_failed, e.message)
            return false
        } finally {
            isGenerating = false
        }
    }
}

private fun defaultGoal(type: GoalType, weeks: Int, priority: GoalPriority): Goal =
    Goal(type = type, targetDate = dateStringWeeksFromNow(weeks), priority = priority)
