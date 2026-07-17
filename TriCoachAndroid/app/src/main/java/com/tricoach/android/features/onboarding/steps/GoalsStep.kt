package com.tricoach.android.features.onboarding.steps

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
import androidx.compose.ui.unit.dp
import com.tricoach.android.features.shared.IntStepperField
import com.tricoach.android.features.shared.OnboardingField
import com.tricoach.android.features.onboarding.OnboardingState
import com.tricoach.android.features.onboarding.dateStringWeeksFromNow
import com.tricoach.android.features.onboarding.formatTargetDate
import com.tricoach.android.features.onboarding.weeksFromNow
import com.tricoach.android.models.Goal
import com.tricoach.android.models.GoalPriority
import com.tricoach.android.models.GoalType
import com.tricoach.android.models.label

@Composable
fun GoalsStep(state: OnboardingState) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Vos objectifs", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Vous pouvez viser plusieurs courses ; la priorité A détermine le plan généré.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        state.goals.forEachIndexed { index, goal ->
            GoalCard(
                goal = goal,
                onChange = { state.updateGoal(index, it) },
                onDelete = if (state.goals.size > 1) ({ state.removeGoal(index) }) else null,
            )
        }

        TextButton(onClick = { state.addGoal() }) { Text("+ Ajouter un objectif") }
    }
}

@Composable
private fun GoalCard(goal: Goal, onChange: (Goal) -> Unit, onDelete: (() -> Unit)?) {
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
                TextButton(onClick = onDelete) { Text("Supprimer") }
            }
        }

        val weeks = weeksFromNow(goal.targetDate)
        IntStepperField(
            label = "Date cible",
            value = weeks,
            onValueChange = { onChange(goal.copy(targetDate = dateStringWeeksFromNow(it))) },
            range = 1..208,
            valueLabel = { "$it semaines — ${formatTargetDate(goal.targetDate)}" },
        )

        OnboardingField("Priorité") {
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
            Text("Temps visé", modifier = Modifier.weight(1f))
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
                        label = "Heures",
                        value = totalSeconds / 3600,
                        onValueChange = { h -> onChange(goal.copy(targetTimeSeconds = h * 3600 + (totalSeconds % 3600 / 60) * 60)) },
                        range = 0..15,
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    IntStepperField(
                        label = "Minutes",
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
