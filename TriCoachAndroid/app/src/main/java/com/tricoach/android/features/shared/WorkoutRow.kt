package com.tricoach.android.features.shared

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.models.SportType
import com.tricoach.android.models.Workout
import com.tricoach.android.models.WorkoutIntensity
import com.tricoach.android.models.WorkoutStatus
import com.tricoach.android.models.label

fun sportEmoji(sport: SportType): String = when (sport) {
    SportType.RUN -> "🏃"
    SportType.BIKE -> "🚴"
    SportType.SWIM -> "🏊"
    SportType.BRICK -> "🔁"
    SportType.STRENGTH -> "🏋"
    SportType.REST -> "💤"
}

fun intensityColor(intensity: WorkoutIntensity): Color = when (intensity) {
    WorkoutIntensity.EASY -> Color(0xFF2E7D32)
    WorkoutIntensity.MODERATE -> Color(0xFFF57C00)
    WorkoutIntensity.HARD -> Color(0xFFC62828)
}

/** Mirrors iOS's WorkoutRowView: sport glyph, title (struck through if skipped), duration/TSS caption, intensity pill, completed checkmark. */
@Composable
fun WorkoutRow(workout: Workout, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(intensityColor(workout.intensity).copy(alpha = 0.15f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(sportEmoji(workout.sport))
        }

        Column(modifier = Modifier.weight(1f).padding(horizontal = 12.dp)) {
            Text(
                workout.title,
                style = MaterialTheme.typography.titleSmall,
                textDecoration = if (workout.status == WorkoutStatus.SKIPPED) TextDecoration.LineThrough else null,
                color = if (workout.status == WorkoutStatus.SKIPPED) {
                    MaterialTheme.colorScheme.onSurfaceVariant
                } else {
                    MaterialTheme.colorScheme.onSurface
                },
            )
            val tssSuffix = workout.estimatedTSS?.let { stringResource(R.string.workout_row_tss_suffix, it.toInt()) } ?: ""
            Text(
                stringResource(R.string.workout_row_duration_minutes, workout.plannedDurationMin) + tssSuffix,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        val color = intensityColor(workout.intensity)
        Text(
            workout.intensity.label,
            style = MaterialTheme.typography.labelSmall,
            color = color,
            modifier = Modifier
                .background(color.copy(alpha = 0.15f), RoundedCornerShape(50))
                .padding(horizontal = 10.dp, vertical = 4.dp),
        )

        if (workout.status == WorkoutStatus.COMPLETED) {
            Text("✓", color = Color(0xFF2E7D32), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(start = 8.dp))
        }
    }
}
