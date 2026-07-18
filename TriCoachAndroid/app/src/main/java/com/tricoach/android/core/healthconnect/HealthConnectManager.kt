package com.tricoach.android.core.healthconnect

import android.content.Context
import androidx.activity.result.contract.ActivityResultContract
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.Vo2MaxRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.tricoach.android.core.network.HealthActivitySync
import com.tricoach.android.core.network.HealthMetricSync
import com.tricoach.android.core.network.HealthSyncRequest
import com.tricoach.android.models.SportType
import java.time.Instant
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit

enum class HealthConnectAvailability {
    AVAILABLE,
    NOT_INSTALLED,
    UNSUPPORTED,
}

/**
 * Reads exercise sessions, sleep, HRV, resting HR and VO2max from Health
 * Connect — Android's HealthKit equivalent. Mirrors HealthKitManager.swift's
 * scope, but read-only permissions must be granted per-launch via an
 * ActivityResultContract (no persistent "has ever asked" flag the way
 * HealthKit exposes one), and the provider itself (Health Connect) may not
 * be installed on the device, which HealthKit never has to account for.
 */
class HealthConnectManager(private val context: Context) {
    companion object {
        val PERMISSIONS: Set<String> = setOf(
            HealthPermission.getReadPermission(ExerciseSessionRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
            HealthPermission.getReadPermission(RestingHeartRateRecord::class),
            HealthPermission.getReadPermission(Vo2MaxRecord::class),
        )

        /** 2-year window / 500-session cap — mirrors HealthKitProvider.fetchRecentActivities's own limit. */
        private const val EXERCISE_HISTORY_DAYS = 730L
        private const val MAX_EXERCISE_SESSIONS = 500
    }

    private val client: HealthConnectClient? by lazy {
        if (availability() == HealthConnectAvailability.AVAILABLE) HealthConnectClient.getOrCreate(context) else null
    }

    fun availability(): HealthConnectAvailability =
        when (HealthConnectClient.getSdkStatus(context)) {
            HealthConnectClient.SDK_AVAILABLE -> HealthConnectAvailability.AVAILABLE
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> HealthConnectAvailability.NOT_INSTALLED
            else -> HealthConnectAvailability.UNSUPPORTED
        }

    fun permissionRequestContract(): ActivityResultContract<Set<String>, Set<String>> =
        PermissionController.createRequestPermissionResultContract()

    suspend fun hasAllPermissions(): Boolean {
        val hcClient = client ?: return false
        return hcClient.permissionController.getGrantedPermissions().containsAll(PERMISSIONS)
    }

    /** Builds the payload for `IntegrationsApi.syncHealthMetrics` — one call, mirroring HealthKitProvider's "sync everything since the last check" shape. */
    suspend fun buildSyncRequest(): HealthSyncRequest {
        val hcClient = client ?: return HealthSyncRequest()
        val now = Instant.now()
        val exerciseSince = now.minus(EXERCISE_HISTORY_DAYS, ChronoUnit.DAYS)
        val metricsSince = now.minus(7, ChronoUnit.DAYS)

        val sessions = hcClient.readRecords(
            ReadRecordsRequest(ExerciseSessionRecord::class, timeRangeFilter = TimeRangeFilter.between(exerciseSince, now)),
        ).records.sortedByDescending { it.startTime }.take(MAX_EXERCISE_SESSIONS)

        val sleepSessions = hcClient.readRecords(
            ReadRecordsRequest(SleepSessionRecord::class, timeRangeFilter = TimeRangeFilter.between(now.minus(1, ChronoUnit.DAYS), now)),
        ).records

        val restingHr = hcClient.readRecords(
            ReadRecordsRequest(RestingHeartRateRecord::class, timeRangeFilter = TimeRangeFilter.between(metricsSince, now)),
        ).records.maxByOrNull { it.time }

        val hrv = hcClient.readRecords(
            ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, timeRangeFilter = TimeRangeFilter.between(metricsSince, now)),
        ).records.maxByOrNull { it.time }

        val vo2max = hcClient.readRecords(
            ReadRecordsRequest(Vo2MaxRecord::class, timeRangeFilter = TimeRangeFilter.between(metricsSince, now)),
        ).records.maxByOrNull { it.time }

        val metric = HealthMetricSync(
            date = now.toString(),
            restingHr = restingHr?.beatsPerMinute?.toInt(),
            hrvMs = hrv?.heartRateVariabilityMillis,
            vo2max = vo2max?.vo2MillilitersPerMinuteKilogram,
            sleepDurationMin = if (sleepSessions.isEmpty()) null else HealthConnectMapper.sleepDurationMinutes(sleepSessions),
        )

        return HealthSyncRequest(
            activities = sessions.map(HealthConnectMapper::toActivitySync),
            healthMetrics = listOf(metric),
        )
    }
}

/** Split from HealthConnectManager (which only talks to HealthConnectClient) so the mapping logic can be unit tested without a real client — mirrors HealthKitMapper.swift. */
object HealthConnectMapper {
    /**
     * ExerciseSessionRecord has ~50 exercise types; only run/bike/swim get
     * their own SportType — everything else (yoga, rowing, HIIT...) falls
     * back to STRENGTH rather than a misleading default, mirroring
     * HealthKitMapper.sportType's identical fallback rationale.
     */
    fun sportType(exerciseType: Int): SportType = when (exerciseType) {
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL,
        ExerciseSessionRecord.EXERCISE_TYPE_WALKING,
        ExerciseSessionRecord.EXERCISE_TYPE_HIKING,
        -> SportType.RUN
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING,
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY,
        -> SportType.BIKE
        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_OPEN_WATER,
        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL,
        -> SportType.SWIM
        else -> SportType.STRENGTH
    }

    /**
     * Distance/power/pace are left null — ExerciseSessionRecord doesn't carry
     * them directly (they live in separate DistanceRecord/PowerRecord time
     * series requiring an extra aggregate query per session), and the
     * backend matches synced activities to planned workouts by date+sport,
     * not distance, so this doesn't block the "sync a run → plan adapts"
     * demonstrability bar (see activityIngestion.ts).
     */
    fun toActivitySync(session: ExerciseSessionRecord): HealthActivitySync = HealthActivitySync(
        source = "healthConnect",
        externalId = session.metadata.id,
        startTime = session.startTime.toString(),
        durationS = session.endTime.epochSecond.minus(session.startTime.epochSecond).toInt(),
        sport = sportType(session.exerciseType),
    )

    /** Sums sleep session durations over the queried window — naive total, not a stage breakdown, mirroring HealthKitMapper.sleepDurationMinutes. */
    fun sleepDurationMinutes(sessions: List<SleepSessionRecord>): Int =
        sessions.sumOf { ChronoUnit.MINUTES.between(it.startTime.atZone(ZoneOffset.UTC), it.endTime.atZone(ZoneOffset.UTC)) }.toInt()
}
