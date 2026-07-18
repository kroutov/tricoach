package com.tricoach.android.features.workoutdetail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.app.AppContainer
import com.tricoach.android.features.shared.CardBox
import com.tricoach.android.features.shared.IntStepperField
import com.tricoach.android.features.shared.formatFullDate
import com.tricoach.android.features.shared.intensityColor
import com.tricoach.android.features.shared.paceLabel
import com.tricoach.android.features.shared.parseIsoDate
import com.tricoach.android.models.IntervalBlock
import com.tricoach.android.models.TargetZone
import com.tricoach.android.models.Workout
import com.tricoach.android.models.WorkoutSection
import com.tricoach.android.models.WorkoutStatus
import com.tricoach.android.models.label
import kotlinx.coroutines.launch
import java.time.LocalDate

/** Mirrors iOS's WorkoutDetailView: header, load summary, warmup/main-set/cooldown, then complete/reschedule/skip actions. */
@Composable
fun WorkoutDetailScreen(
    container: AppContainer,
    workout: Workout,
    onWorkoutUpdated: (Workout) -> Unit,
    onBack: () -> Unit,
) {
    val state = remember { WorkoutDetailState(container, workout) }
    val scope = rememberCoroutineScope()
    var showFeedbackDialog by remember { mutableStateOf(false) }
    var showRescheduleDialog by remember { mutableStateOf(false) }

    val current = state.workout

    Column(modifier = Modifier.fillMaxSize()) {
        Text(current.sport.label, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(16.dp, 16.dp, 16.dp, 8.dp))

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Header(current)
            LoadSummaryCard(current)
            SectionCard(title = stringResource(R.string.workout_detail_warmup), section = current.structure.warmup)
            MainSetCard(current.structure.mainSet)
            SectionCard(title = stringResource(R.string.workout_detail_cooldown), section = current.structure.cooldown)
            Actions(
                workout = current,
                isSubmitting = state.isSubmitting,
                errorMessage = state.errorMessage,
                onMarkCompleted = { showFeedbackDialog = true },
                onReschedule = { showRescheduleDialog = true },
                onMarkSkipped = {
                    scope.launch {
                        state.markSkipped()
                        onWorkoutUpdated(state.workout)
                    }
                },
            )
        }
    }

    if (showFeedbackDialog) {
        FeedbackDialog(
            state = state,
            onDismiss = { showFeedbackDialog = false },
            onDone = {
                scope.launch {
                    state.markCompleted()
                    showFeedbackDialog = false
                    onWorkoutUpdated(state.workout)
                }
            },
        )
    }

    if (showRescheduleDialog) {
        RescheduleDialog(
            state = state,
            onDismiss = { showRescheduleDialog = false },
            onDone = {
                scope.launch {
                    state.reschedule(it)
                    if (state.errorMessage == null) {
                        showRescheduleDialog = false
                        onWorkoutUpdated(state.workout)
                    }
                }
            },
        )
    }

    state.lastAdaptationSummary?.let { summary ->
        AlertDialog(
            onDismissRequest = { state.dismissAdaptationSummary() },
            title = { Text(stringResource(R.string.workout_detail_plan_adjusted_title)) },
            text = { Text(summary) },
            confirmButton = { TextButton(onClick = { state.dismissAdaptationSummary() }) { Text(stringResource(R.string.workout_detail_dialog_understood)) } },
        )
    }

    state.rescheduleConflictMessage?.let { conflict ->
        AlertDialog(
            onDismissRequest = { state.rescheduleConflictMessage = null },
            title = { Text(stringResource(R.string.workout_detail_conflict_title)) },
            text = { Text(conflict) },
            confirmButton = { TextButton(onClick = { state.rescheduleConflictMessage = null }) { Text(stringResource(R.string.workout_detail_dialog_understood)) } },
        )
    }
}

@Composable
private fun Header(workout: Workout) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            IntensityPill(workout)
            if (workout.status != WorkoutStatus.PLANNED) {
                StatusPill(workout.status)
            }
            Spacer(Modifier.weight(1f))
            Text(formatFullDate(workout.date), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(workout.title, style = MaterialTheme.typography.headlineMedium)
        Text(workout.summary, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun IntensityPill(workout: Workout) {
    val color = intensityColor(workout.intensity)
    Text(
        workout.intensity.label,
        style = MaterialTheme.typography.labelSmall,
        color = color,
        modifier = Modifier
            .background(color.copy(alpha = 0.15f), RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}

@Composable
private fun StatusPill(status: WorkoutStatus) {
    val completed = status == WorkoutStatus.COMPLETED
    val color = if (completed) Color(0xFF2E7D32) else MaterialTheme.colorScheme.onSurfaceVariant
    Text(
        stringResource(if (completed) R.string.workout_detail_status_completed else R.string.workout_detail_status_missed),
        style = MaterialTheme.typography.labelSmall,
        color = color,
        modifier = Modifier
            .background(color.copy(alpha = 0.15f), RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}

@Composable
private fun LoadSummaryCard(workout: Workout) {
    CardBox {
        Row(modifier = Modifier.fillMaxWidth()) {
            Metric(stringResource(R.string.workout_detail_duration_value, workout.plannedDurationMin), stringResource(R.string.workout_detail_duration_label), Modifier.weight(1f))
            Metric(
                workout.rpeTarget?.let { stringResource(R.string.workout_detail_rpe_value, it) } ?: stringResource(R.string.workout_detail_value_unknown),
                stringResource(R.string.workout_detail_rpe_target_label),
                Modifier.weight(1f),
            )
            Metric(
                workout.estimatedTSS?.let { "${it.toInt()}" } ?: stringResource(R.string.workout_detail_value_unknown),
                stringResource(R.string.workout_detail_tss_label),
                Modifier.weight(1f),
            )
            Metric(
                workout.estimatedTRIMP?.let { "${it.toInt()}" } ?: stringResource(R.string.workout_detail_value_unknown),
                stringResource(R.string.workout_detail_trimp_label),
                Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun Metric(value: String, label: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleMedium)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun SectionCard(title: String, section: WorkoutSection) {
    CardBox {
        Text(stringResource(R.string.workout_detail_section_with_duration, title, section.durationMin), style = MaterialTheme.typography.titleMedium)
        Text(section.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        ZoneRow(section.target)
    }
}

@Composable
private fun MainSetCard(mainSet: List<IntervalBlock>) {
    if (mainSet.isEmpty()) return
    CardBox {
        Text(stringResource(R.string.workout_detail_main_set_title), style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(4.dp))
        mainSet.forEachIndexed { index, block ->
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(blockLabel(block), style = MaterialTheme.typography.bodyMedium)
                block.note?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                ZoneRow(block.target)
            }
            if (index != mainSet.lastIndex) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            }
        }
    }
}

@Composable
private fun blockLabel(block: IntervalBlock): String {
    if (block.repetitions <= 1) {
        return stringResource(R.string.workout_detail_block_continuous, block.workDurationSec / 60)
    }
    val recovery = if (block.recoveryDurationSec > 0) {
        stringResource(R.string.workout_detail_block_recovery_suffix, block.recoveryDurationSec)
    } else {
        ""
    }
    val workLabel = if (block.workDurationSec >= 60) {
        stringResource(R.string.workout_detail_block_work_minutes, block.workDurationSec / 60)
    } else {
        stringResource(R.string.workout_detail_block_work_seconds, block.workDurationSec)
    }
    return stringResource(R.string.workout_detail_block_repeated, block.repetitions, workLabel) + recovery
}

@Composable
private fun ZoneRow(target: TargetZone) {
    val parts = buildList {
        target.hrZone?.let { add("Z$it") }
        target.hrRangeBpm?.let { add("${it.lowerBound.toInt()}-${it.upperBound.toInt()} bpm") }
        target.paceSecPerKm?.let { add("${paceLabel(it.lowerBound.toInt())}-${paceLabel(it.upperBound.toInt())}/km") }
        target.paceSecPer100m?.let { add("${paceLabel(it.lowerBound.toInt())}-${paceLabel(it.upperBound.toInt())}/100m") }
        target.powerWatts?.let { add("${it.lowerBound.toInt()}-${it.upperBound.toInt()} W") }
    }
    if (parts.isEmpty()) return
    Text(parts.joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun Actions(
    workout: Workout,
    isSubmitting: Boolean,
    errorMessage: String?,
    onMarkCompleted: () -> Unit,
    onReschedule: () -> Unit,
    onMarkSkipped: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (workout.status == WorkoutStatus.PLANNED) {
            Button(onClick = onMarkCompleted, enabled = !isSubmitting, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.workout_detail_action_mark_completed))
            }
            OutlinedButton(onClick = onReschedule, enabled = !isSubmitting, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.workout_detail_action_reschedule))
            }
            TextButton(onClick = onMarkSkipped, enabled = !isSubmitting, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.workout_detail_action_mark_skipped), color = MaterialTheme.colorScheme.error)
            }
        }
        errorMessage?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }
    }
}

@Composable
private fun FeedbackDialog(state: WorkoutDetailState, onDismiss: () -> Unit, onDone: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.workout_detail_feedback_title)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                IntStepperField(
                    label = stringResource(R.string.workout_detail_feedback_duration),
                    value = state.actualDurationMin,
                    onValueChange = { state.actualDurationMin = it },
                    range = 5..300,
                    step = 5,
                    valueLabel = { stringResource(R.string.workout_detail_duration_value, it) },
                )
                IntStepperField(
                    label = stringResource(R.string.workout_detail_feedback_rpe),
                    value = state.actualRpe,
                    onValueChange = { state.actualRpe = it },
                    range = 1..10,
                    valueLabel = { stringResource(R.string.workout_detail_rpe_value, it) },
                )
            }
        },
        confirmButton = {
            TextButton(onClick = onDone, enabled = !state.isSubmitting) {
                if (state.isSubmitting) CircularProgressIndicator(modifier = Modifier.height(16.dp)) else Text(stringResource(R.string.workout_detail_confirm))
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.workout_detail_cancel)) } },
    )
}

@Composable
private fun RescheduleDialog(state: WorkoutDetailState, onDismiss: () -> Unit, onDone: (LocalDate) -> Unit) {
    val originalDate = remember(state.workout.id) { parseIsoDate(state.workout.date) }
    var offsetDays by remember { mutableStateOf(0) }
    val newDate = originalDate.plusDays(offsetDays.toLong())

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.workout_detail_reschedule_title)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                IntStepperField(
                    label = stringResource(R.string.workout_detail_reschedule_new_date),
                    value = offsetDays,
                    onValueChange = { offsetDays = it },
                    range = -6..6,
                    valueLabel = { formatFullDate(newDate.toString()) },
                )
                state.errorMessage?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
            }
        },
        confirmButton = {
            TextButton(onClick = { onDone(newDate) }, enabled = !state.isSubmitting) {
                if (state.isSubmitting) CircularProgressIndicator(modifier = Modifier.height(16.dp)) else Text(stringResource(R.string.workout_detail_reschedule_confirm))
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.workout_detail_cancel)) } },
    )
}
