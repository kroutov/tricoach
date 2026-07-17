package com.tricoach.android.features.workoutdetail

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.tricoach.android.app.AppContainer
import com.tricoach.android.models.Workout
import com.tricoach.android.models.WorkoutStatus
import java.time.LocalDate

/** Plain state holder (not a ViewModel) — mirrors iOS's WorkoutDetailViewModel. */
class WorkoutDetailState(private val container: AppContainer, initialWorkout: Workout) {
    var workout by mutableStateOf(initialWorkout)
        private set
    var actualDurationMin by mutableStateOf(initialWorkout.plannedDurationMin)
    var actualRpe by mutableStateOf(initialWorkout.rpeTarget ?: 5)
    var lastAdaptationSummary by mutableStateOf<String?>(null)
        private set
    var errorMessage by mutableStateOf<String?>(null)
    var isSubmitting by mutableStateOf(false)
        private set
    var rescheduleConflictMessage by mutableStateOf<String?>(null)

    fun dismissAdaptationSummary() {
        lastAdaptationSummary = null
    }

    suspend fun markCompleted() {
        complete(WorkoutStatus.COMPLETED, actualDurationMin, actualRpe)
    }

    suspend fun markSkipped() {
        complete(WorkoutStatus.SKIPPED, null, null)
    }

    /** Accessible, non-drag equivalent of the calendar's drag & drop rescheduling (see plan) — same server-side validation (hard: stay in the workout's own training week; soft: conflicts reported back), just driven by a date stepper instead of a drag gesture. */
    suspend fun reschedule(date: LocalDate) {
        errorMessage = null
        isSubmitting = true
        try {
            val response = container.workoutRepository.reschedule(workout.id, date.toString())
            workout = response.workout
            if (response.conflicts.isNotEmpty()) {
                rescheduleConflictMessage = response.conflicts.joinToString("\n")
            }
        } catch (e: Exception) {
            errorMessage = "Impossible de déplacer la séance : ${e.message}"
        } finally {
            isSubmitting = false
        }
    }

    /** The heavy lifting (comparing planned vs. realized, running the adaptation engine) happens server-side — this just reflects the server's verdict back into the UI. */
    private suspend fun complete(status: WorkoutStatus, durationMin: Int?, rpe: Int?) {
        isSubmitting = true
        errorMessage = null
        try {
            val response = container.workoutRepository.complete(workout.id, status, durationMin, rpe)
            workout = response.workout
            if (response.adaptationEvents.isNotEmpty()) {
                lastAdaptationSummary = response.adaptationEvents.joinToString("\n\n") { it.actionTaken }
            }
        } catch (e: Exception) {
            errorMessage = "Impossible d'enregistrer la séance : ${e.message}"
        } finally {
            isSubmitting = false
        }
    }
}
