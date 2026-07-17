package com.tricoach.android.core.repository

import com.tricoach.android.core.network.CompleteWorkoutRequest
import com.tricoach.android.core.network.CompleteWorkoutResponse
import com.tricoach.android.core.network.RescheduleWorkoutRequest
import com.tricoach.android.core.network.RescheduleWorkoutResponse
import com.tricoach.android.core.network.WorkoutApi
import com.tricoach.android.core.network.apiCall
import com.tricoach.android.models.WorkoutStatus

/** Mutation-only, no cache — always requires connectivity, matching iOS (marking a workout complete/rescheduling never has an offline path). */
class WorkoutRepository(private val api: WorkoutApi) {
    suspend fun complete(id: String, status: WorkoutStatus, actualDurationMin: Int?, rpe: Int?): CompleteWorkoutResponse =
        apiCall { api.complete(id, CompleteWorkoutRequest(status, actualDurationMin, rpe)) }

    suspend fun reschedule(id: String, date: String): RescheduleWorkoutResponse =
        apiCall { api.reschedule(id, RescheduleWorkoutRequest(date)) }
}
