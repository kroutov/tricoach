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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.features.onboarding.OnboardingState
import com.tricoach.android.features.shared.formatFullDate
import com.tricoach.android.models.Weekday
import com.tricoach.android.models.label

@Composable
fun SummaryStep(state: OnboardingState) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(stringResource(R.string.onboarding_summary_title), style = MaterialTheme.typography.headlineSmall)
        Text(
            stringResource(R.string.onboarding_summary_hint),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        SummaryCard {
            val ageFragment = state.profile.age?.let { stringResource(R.string.onboarding_summary_age_value, it) }
                ?: stringResource(R.string.onboarding_summary_age_not_provided)
            Text("${state.profile.level.label} • $ageFragment")
            state.profile.weeklyVolumeAvgMin?.let {
                Text(stringResource(R.string.onboarding_summary_weekly_volume, it))
            }
        }

        SummaryCard {
            Text(stringResource(R.string.onboarding_summary_goals_title), style = MaterialTheme.typography.titleMedium)
            state.goals.forEach { goal ->
                Text("${goal.type.label} — ${goal.priority.label} — ${formatFullDate(goal.targetDate)}")
            }
        }

        SummaryCard {
            Text(stringResource(R.string.onboarding_summary_availability_title), style = MaterialTheme.typography.titleMedium)
            Text(
                stringResource(
                    R.string.onboarding_summary_availability_value,
                    state.availability.sessionsPerWeek,
                    state.availability.maxSessionDurationMin,
                ),
            )
            Text(
                state.availability.availableDays
                    .sortedBy { Weekday.orderedWeek.indexOf(it) }
                    .map { Weekday.label(it) }
                    .joinToString(", "),
            )
        }

        SummaryCard {
            Text(stringResource(R.string.onboarding_summary_constraints_title), style = MaterialTheme.typography.titleMedium)
            Text(
                stringResource(
                    R.string.onboarding_summary_constraints_value,
                    state.checkIn.fatigueLevel,
                    state.checkIn.stressLevel,
                    state.checkIn.sleepHours,
                ),
            )
            if (state.checkIn.injuries.isNotEmpty()) {
                Text(state.checkIn.injuries.joinToString(", "), color = MaterialTheme.colorScheme.error)
            }
        }

        Text(
            stringResource(R.string.onboarding_summary_footer),
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
