package com.tricoach.android.features.activityhistory

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.app.AppContainer
import com.tricoach.android.features.shared.formatFullDate
import com.tricoach.android.features.shared.sportEmoji
import com.tricoach.android.models.Activity
import com.tricoach.android.models.label
import java.util.Locale

/** Plain state holder (not a ViewModel) — mirrors GoalsState's shape, read-only (no mutations, so no errorMessage: a failed fetch just falls back to an empty list, same as AdaptationHistoryScreen). */
class ActivityHistoryState(private val container: AppContainer) {
    var activities: List<Activity> by mutableStateOf(emptyList())
        private set
    var isLoading by mutableStateOf(true)
        private set

    suspend fun load() {
        isLoading = true
        activities = runCatching { container.userApiClient.fetchActivities() }.getOrDefault(emptyList())
        isLoading = false
    }
}

/** Flat, reverse-chronological list of synced activities across all sources — mirrors Web's ActivityHistoryPage, reachable from the Profile screen (not a bottom-nav tab). No per-activity detail screen, same as Web. */
@Composable
fun ActivityHistoryScreen(container: AppContainer) {
    val state = remember { ActivityHistoryState(container) }

    LaunchedEffect(Unit) { state.load() }

    Column(modifier = Modifier.fillMaxSize()) {
        Text(stringResource(R.string.activity_history_title), style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(16.dp))

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when {
                state.isLoading -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                state.activities.isEmpty() -> Text(
                    stringResource(R.string.activity_history_empty_state),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                else -> state.activities.forEach { activity -> ActivityRow(activity) }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun formatActivityDuration(durationS: Int): String {
    val totalMinutes = durationS / 60
    return if (totalMinutes >= 60) {
        stringResource(R.string.activity_duration_hours_minutes, totalMinutes / 60, totalMinutes % 60)
    } else {
        stringResource(R.string.activity_duration_minutes, totalMinutes)
    }
}

@Composable
private fun ActivityRow(activity: Activity) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(activity.sport?.let { sportEmoji(it) } ?: "⏱")
        }

        Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
            Text(
                activity.sport?.label ?: stringResource(R.string.activity_unknown_sport),
                style = MaterialTheme.typography.titleSmall,
            )

            val distanceSuffix = activity.distanceM?.let {
                stringResource(R.string.activity_distance_suffix, String.format(Locale.getDefault(), "%.1f", it / 1000))
            } ?: ""
            val hrSuffix = activity.avgHr?.let { stringResource(R.string.activity_avg_hr_suffix, it) } ?: ""
            Text(
                formatActivityDuration(activity.durationS) + distanceSuffix + hrSuffix,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Text(
                "${formatFullDate(activity.startTime)} · ${activity.source.label}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
