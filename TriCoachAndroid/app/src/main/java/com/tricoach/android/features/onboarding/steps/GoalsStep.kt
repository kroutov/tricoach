package com.tricoach.android.features.onboarding.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.tricoach.android.features.onboarding.OnboardingState
import com.tricoach.android.features.shared.GoalEditorCard

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
            GoalEditorCard(
                goal = goal,
                onChange = { state.updateGoal(index, it) },
                onDelete = if (state.goals.size > 1) ({ state.removeGoal(index) }) else null,
            )
        }

        TextButton(onClick = { state.addGoal() }) { Text("+ Ajouter un objectif") }
    }
}
