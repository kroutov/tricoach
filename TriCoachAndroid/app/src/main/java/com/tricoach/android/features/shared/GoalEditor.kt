package com.tricoach.android.features.shared

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.features.onboarding.dateStringWeeksFromNow
import com.tricoach.android.features.onboarding.weeksFromNow
import com.tricoach.android.models.Goal
import com.tricoach.android.models.GoalPriority
import com.tricoach.android.models.GoalType
import com.tricoach.android.models.label

/** Shared goal-editing card — used by both onboarding (GoalsStep) and the standalone Goals screen, mirrors iOS's GoalEditorCard.swift (one place to keep type/date/priority/target-time editing in sync). */
@Composable
fun GoalEditorCard(goal: Goal, onChange: (Goal) -> Unit, onDelete: (() -> Unit)?) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.weight(1f)) {
                GoalTypeDropdown(selected = goal.type, onSelect = { onChange(goal.copy(type = it)) })
            }
            if (onDelete != null) {
                TextButton(onClick = onDelete) { Text(stringResource(R.string.goal_editor_delete)) }
            }
        }

        val weeks = weeksFromNow(goal.targetDate)
        IntStepperField(
            label = stringResource(R.string.goal_editor_target_date),
            value = weeks,
            onValueChange = { onChange(goal.copy(targetDate = dateStringWeeksFromNow(it))) },
            range = 1..208,
            valueLabel = { "${stringResource(R.string.goal_editor_weeks_until, it)} — ${formatFullDate(goal.targetDate)}" },
        )

        OnboardingField(stringResource(R.string.goal_editor_priority)) {
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                GoalPriority.entries.forEachIndexed { index, priority ->
                    SegmentedButton(
                        selected = goal.priority == priority,
                        onClick = { onChange(goal.copy(priority = priority)) },
                        shape = SegmentedButtonDefaults.itemShape(index, GoalPriority.entries.size),
                    ) { Text(priority.label) }
                }
            }
        }

        val hasTargetTime = goal.targetTimeSeconds != null
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.goal_editor_target_time), modifier = Modifier.weight(1f))
            Switch(
                checked = hasTargetTime,
                onCheckedChange = { checked -> onChange(goal.copy(targetTimeSeconds = if (checked) 3600 else null)) },
            )
        }
        if (hasTargetTime) {
            val totalSeconds = goal.targetTimeSeconds ?: 3600
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(modifier = Modifier.weight(1f)) {
                    IntStepperField(
                        label = stringResource(R.string.goal_editor_hours),
                        value = totalSeconds / 3600,
                        onValueChange = { h -> onChange(goal.copy(targetTimeSeconds = h * 3600 + (totalSeconds % 3600 / 60) * 60)) },
                        range = 0..15,
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    IntStepperField(
                        label = stringResource(R.string.goal_editor_minutes),
                        value = (totalSeconds % 3600) / 60,
                        onValueChange = { m -> onChange(goal.copy(targetTimeSeconds = (totalSeconds / 3600) * 3600 + m * 60)) },
                        range = 0..59,
                        step = 5,
                    )
                }
            }
        }
    }
}

@Composable
private fun GoalTypeDropdown(selected: GoalType, onSelect: (GoalType) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) {
            Text(selected.label)
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            GoalType.entries.forEach { type ->
                DropdownMenuItem(text = { Text(type.label) }, onClick = { onSelect(type); expanded = false })
            }
        }
    }
}
