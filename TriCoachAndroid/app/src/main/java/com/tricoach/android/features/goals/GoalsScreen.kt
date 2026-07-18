package com.tricoach.android.features.goals

import androidx.compose.foundation.background
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.tricoach.android.app.AppContainer
import com.tricoach.android.features.shared.CardBox
import com.tricoach.android.features.shared.GoalEditorCard
import com.tricoach.android.features.shared.formatFullDate
import com.tricoach.android.models.Goal
import com.tricoach.android.models.label
import kotlinx.coroutines.launch

/** Standalone goals CRUD + plan regeneration — mirrors iOS's GoalsManagementView, reachable from the Profile screen (not a bottom-nav tab). */
@Composable
fun GoalsScreen(container: AppContainer) {
    val state = remember { GoalsState(container) }
    val scope = rememberCoroutineScope()
    var editingGoal by remember { mutableStateOf<Goal?>(null) }
    var isNewGoal by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { state.load() }

    Column(modifier = Modifier.fillMaxSize()) {
        Text("Objectifs", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(16.dp))

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when {
                state.isLoading -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                state.goals.isEmpty() -> Text(
                    "Aucun objectif. Ajoutez-en un pour générer votre plan.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                else -> state.goals.forEach { goal ->
                    GoalSummaryRow(goal = goal, onClick = { editingGoal = goal; isNewGoal = false })
                }
            }

            TextButton(onClick = { editingGoal = newDraftGoal(); isNewGoal = true }) {
                Text("+ Ajouter un objectif")
            }

            Spacer(Modifier.height(8.dp))
            HorizontalDivider()
            Spacer(Modifier.height(8.dp))

            Button(
                onClick = { scope.launch { state.regeneratePlan() } },
                enabled = state.goals.isNotEmpty() && !state.isRegenerating,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (state.isRegenerating) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp))
                } else {
                    Text("Régénérer mon plan")
                }
            }
            Text(
                "Le plan est régénéré à partir de l'objectif de priorité A (ou du premier objectif si aucun n'est prioritaire). Le plan actuel est archivé, pas supprimé.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            state.regenerationMessage?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
            }
            state.errorMessage?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            }
        }
    }

    editingGoal?.let { goal ->
        GoalEditDialog(
            initialGoal = goal,
            isNew = isNewGoal,
            onDismiss = { editingGoal = null },
            onSave = { updated -> scope.launch { state.save(updated); editingGoal = null } },
            onDelete = if (goal.id.isNotBlank()) {
                { scope.launch { state.delete(goal); editingGoal = null } }
            } else {
                null
            },
        )
    }
}

@Composable
private fun GoalSummaryRow(goal: Goal, onClick: () -> Unit) {
    CardBox(modifier = Modifier.clickable(onClick = onClick)) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(goal.type.label, style = MaterialTheme.typography.titleMedium)
                Text(
                    formatFullDate(goal.targetDate),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                goal.priority.label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f), RoundedCornerShape(50))
                    .padding(horizontal = 10.dp, vertical = 4.dp),
            )
        }
    }
}

@Composable
private fun GoalEditDialog(
    initialGoal: Goal,
    isNew: Boolean,
    onDismiss: () -> Unit,
    onSave: (Goal) -> Unit,
    onDelete: (() -> Unit)?,
) {
    var goal by remember(initialGoal.id) { mutableStateOf(initialGoal) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (isNew) "Nouvel objectif" else "Modifier l'objectif") },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                GoalEditorCard(goal = goal, onChange = { goal = it }, onDelete = onDelete)
            }
        },
        confirmButton = { TextButton(onClick = { onSave(goal) }) { Text("Enregistrer") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } },
    )
}
