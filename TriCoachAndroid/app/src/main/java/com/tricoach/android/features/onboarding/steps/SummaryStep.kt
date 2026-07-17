package com.tricoach.android.features.onboarding.steps

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.tricoach.android.features.onboarding.OnboardingState
import com.tricoach.android.features.onboarding.formatTargetDate
import com.tricoach.android.models.Weekday
import com.tricoach.android.models.label

@Composable
fun SummaryStep(state: OnboardingState) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Résumé", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Vérifiez vos informations avant de générer votre plan personnalisé.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        SummaryCard {
            Text("${state.profile.level.label} • ${state.profile.age?.let { "$it ans" } ?: "âge non renseigné"}")
            state.profile.weeklyVolumeAvgMin?.let {
                Text("$it min/semaine en moyenne actuellement")
            }
        }

        SummaryCard {
            Text("Objectifs", style = MaterialTheme.typography.titleMedium)
            state.goals.forEach { goal ->
                Text("${goal.type.label} — ${goal.priority.label} — ${formatTargetDate(goal.targetDate)}")
            }
        }

        SummaryCard {
            Text("Disponibilités", style = MaterialTheme.typography.titleMedium)
            Text("${state.availability.sessionsPerWeek} séances/semaine, ${state.availability.maxSessionDurationMin} min max")
            Text(
                state.availability.availableDays
                    .sortedBy { Weekday.orderedWeek.indexOf(it) }
                    .joinToString(", ") { Weekday.label(it) },
            )
        }

        SummaryCard {
            Text("Contraintes", style = MaterialTheme.typography.titleMedium)
            Text(
                "Fatigue ${state.checkIn.fatigueLevel}/5 · Stress ${state.checkIn.stressLevel}/5 · " +
                    "Sommeil %.1f h".format(state.checkIn.sleepHours),
            )
            if (state.checkIn.injuries.isNotEmpty()) {
                Text(state.checkIn.injuries.joinToString(", "), color = MaterialTheme.colorScheme.error)
            }
        }

        Text(
            "Appuyez sur « Générer mon plan » pour construire votre programme périodisé.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SummaryCard(content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
        content = content,
    )
}
