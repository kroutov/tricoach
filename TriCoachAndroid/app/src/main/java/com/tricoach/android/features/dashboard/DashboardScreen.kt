package com.tricoach.android.features.dashboard

import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.app.AppContainer
import com.tricoach.android.core.network.apiCall
import com.tricoach.android.features.shared.CardBox
import com.tricoach.android.features.shared.WorkoutRow
import com.tricoach.android.models.AdaptationEvent
import com.tricoach.android.models.DashboardSummary
import com.tricoach.android.models.Workout
import com.tricoach.android.models.label

/** Android Phase 1 deliberately calls GET /dashboard/summary directly instead of reconstructing the numbers client-side from the full plan tree (as iOS does) — same displayed result, simpler code. */
@Composable
fun DashboardScreen(
    container: AppContainer,
    onWorkoutClick: (Workout) -> Unit,
    onViewAdaptationHistory: () -> Unit,
    onViewAnalytics: () -> Unit,
) {
    var summary by remember { mutableStateOf<DashboardSummary?>(null) }
    var adaptationEvents by remember { mutableStateOf<List<AdaptationEvent>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current

    suspend fun load() {
        isLoading = true
        errorMessage = null
        val result = try {
            apiCall { container.dashboardApi.fetchSummary() }
        } catch (e: Exception) {
            errorMessage = context.getString(R.string.dashboard_error_load_failed)
            isLoading = false
            return
        }
        summary = result
        adaptationEvents = result.planId?.let { planId ->
            runCatching { container.adaptationEventRepository.fetchEvents(planId).take(5) }.getOrDefault(emptyList())
        } ?: emptyList()
        isLoading = false
    }

    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize()) {
        Text(stringResource(R.string.dashboard_title), style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(16.dp))

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            when {
                isLoading -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                errorMessage != null -> Text(errorMessage!!, color = MaterialTheme.colorScheme.error)
                summary?.hasActivePlan != true -> Text(
                    stringResource(R.string.dashboard_no_active_plan),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                else -> {
                    val s = summary!!
                    WeekCard(s)
                    LoadCard(s)
                    AnalyticsLinkCard(onViewAnalytics)
                    if (s.upcomingWorkouts.isNotEmpty()) {
                        UpcomingCard(s.upcomingWorkouts, onWorkoutClick)
                    }
                    HealthPlaceholderCard()
                    if (adaptationEvents.isNotEmpty()) {
                        AdaptationCard(adaptationEvents, onViewAdaptationHistory)
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun WeekCard(summary: DashboardSummary) {
    val progress = if (summary.weekPlannedLoad > 0) {
        (summary.weekCompletedLoad / summary.weekPlannedLoad).toFloat().coerceIn(0f, 1f)
    } else {
        0f
    }
    CardBox {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.size(64.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(progress = { progress }, modifier = Modifier.size(64.dp), strokeWidth = 6.dp)
                Text(stringResource(R.string.dashboard_progress_percent, (progress * 100).toInt()), style = MaterialTheme.typography.labelLarge)
            }
            Spacer(Modifier.width(16.dp))
            Column {
                val weekLabel = if (summary.weekNumber != null && summary.durationWeeks != null) {
                    stringResource(R.string.dashboard_week_number, summary.weekNumber, summary.durationWeeks)
                } else {
                    stringResource(R.string.dashboard_week_current)
                }
                Text(weekLabel, style = MaterialTheme.typography.titleMedium)
                Text(
                    summary.currentPhase?.label ?: stringResource(R.string.dashboard_phase_unknown),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (summary.isRecoveryWeek) {
                    Text(
                        stringResource(R.string.dashboard_recovery_week),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }
    }
}

@Composable
private fun LoadCard(summary: DashboardSummary) {
    CardBox {
        Text(stringResource(R.string.dashboard_load_title), style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        Row(modifier = Modifier.fillMaxWidth()) {
            Metric(value = summary.weekCompletedLoad.toInt().toString(), label = stringResource(R.string.dashboard_load_completed), modifier = Modifier.weight(1f))
            Metric(value = summary.weekPlannedLoad.toInt().toString(), label = stringResource(R.string.dashboard_load_planned), modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun Metric(value: String, label: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        Text(value, style = MaterialTheme.typography.headlineSmall)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun AnalyticsLinkCard(onClick: () -> Unit) {
    CardBox(modifier = Modifier.clickable(onClick = onClick)) {
        Text(stringResource(R.string.dashboard_analytics_link_title), style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(4.dp))
        Text(
            stringResource(R.string.dashboard_analytics_link_hint),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun UpcomingCard(workouts: List<Workout>, onWorkoutClick: (Workout) -> Unit) {
    CardBox {
        Text(stringResource(R.string.dashboard_upcoming_title), style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            workouts.forEach { workout ->
                WorkoutRow(workout = workout, onClick = { onWorkoutClick(workout) })
            }
        }
    }
}

@Composable
private fun HealthPlaceholderCard() {
    CardBox {
        Text(stringResource(R.string.dashboard_health_placeholder_title), style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(4.dp))
        Text(
            stringResource(R.string.dashboard_health_placeholder_hint),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun AdaptationCard(events: List<AdaptationEvent>, onViewHistory: () -> Unit) {
    CardBox {
        Text(stringResource(R.string.dashboard_adaptation_title), style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        events.forEachIndexed { index, event ->
            Column {
                Text(event.triggeredBy.label, style = MaterialTheme.typography.bodyMedium)
                // Intentionally not localized: opaque string from the backend's adaptationEngine.ts, French-only regardless of device language.
                Text(event.actionTaken, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (index != events.lastIndex) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            }
        }
        TextButton(onClick = onViewHistory) { Text(stringResource(R.string.dashboard_adaptation_view_all)) }
    }
}
