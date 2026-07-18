package com.tricoach.android.features.adaptation

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
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.app.AppContainer
import com.tricoach.android.features.shared.CardBox
import com.tricoach.android.features.shared.formatFullDate
import com.tricoach.android.models.AdaptationEvent
import com.tricoach.android.models.label
import kotlin.math.roundToInt

/** Full adaptation history — mirrors iOS's AdaptationHistoryView, reachable from the Dashboard's "Dernières adaptations" card (which only shows the 5 most recent, see DashboardScreen.kt). */
@Composable
fun AdaptationHistoryScreen(container: AppContainer) {
    var events by remember { mutableStateOf<List<AdaptationEvent>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        isLoading = true
        val planId = runCatching { container.planRepository.fetchActivePlan()?.id }.getOrNull()
        events = planId?.let {
            runCatching { container.adaptationEventRepository.fetchEvents(it) }.getOrDefault(emptyList())
        } ?: emptyList()
        isLoading = false
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Text(stringResource(R.string.adaptation_title), style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(16.dp))

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when {
                isLoading -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                events.isEmpty() -> Text(
                    stringResource(R.string.adaptation_empty_state),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                else -> events.forEach { event -> AdaptationEventCard(event) }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun AdaptationEventCard(event: AdaptationEvent) {
    CardBox {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(event.triggeredBy.label, style = MaterialTheme.typography.titleMedium)
            event.deltaLoadPercent?.let { delta ->
                val positive = delta >= 0
                val color = if (positive) Color(0xFF2E7D32) else Color(0xFFC62828)
                Text(
                    "${if (positive) "+" else ""}${delta.roundToInt()}%",
                    style = MaterialTheme.typography.labelSmall,
                    color = color,
                    modifier = Modifier
                        .background(color.copy(alpha = 0.15f), RoundedCornerShape(50))
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }
        }
        Spacer(Modifier.height(4.dp))
        // Intentionally not localized: opaque string from the backend's adaptationEngine.ts, French-only regardless of device language.
        Text(event.actionTaken, style = MaterialTheme.typography.bodyMedium)
        if (event.createdAt.isNotBlank()) {
            Spacer(Modifier.height(4.dp))
            Text(
                formatFullDate(event.createdAt),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
