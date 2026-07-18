package com.tricoach.android.features.profile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.app.AppContainer
import com.tricoach.android.features.integrations.HealthConnectSection
import com.tricoach.android.features.integrations.StravaConnectSection
import com.tricoach.android.features.shared.CardBox
import com.tricoach.android.features.shared.formatFullDate
import com.tricoach.android.models.AthleteProfile
import com.tricoach.android.models.Goal
import com.tricoach.android.models.GoalPriority
import com.tricoach.android.models.User
import com.tricoach.android.models.label
import kotlinx.coroutines.launch

/** Read-only account/athlete summary + Objectifs entry point + sign out + Intégrations (Strava/Health Connect). */
@Composable
fun ProfileScreen(
    container: AppContainer,
    user: User?,
    onUserUpdated: suspend (User) -> Unit,
    onSignOut: suspend () -> Unit,
    onNavigateToGoals: () -> Unit,
) {
    var profile by remember { mutableStateOf(AthleteProfile.empty) }
    var goals by remember { mutableStateOf<List<Goal>>(emptyList()) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        profile = runCatching { container.profileRepository.fetch() }.getOrDefault(AthleteProfile.empty)
        goals = runCatching { container.goalRepository.fetchGoals() }.getOrDefault(emptyList())
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Text(stringResource(R.string.profile_title), style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(16.dp))

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            CardBox {
                Text(stringResource(R.string.profile_account_title), style = MaterialTheme.typography.titleMedium)
                LabeledRow(stringResource(R.string.profile_account_name), user?.fullName ?: stringResource(R.string.profile_account_fallback_name))
                user?.email?.let { LabeledRow(stringResource(R.string.profile_account_email), it) }
            }

            CardBox {
                Text(stringResource(R.string.profile_athlete_title), style = MaterialTheme.typography.titleMedium)
                LabeledRow(stringResource(R.string.profile_athlete_level), profile.level.label)
                profile.hrMax?.let { LabeledRow(stringResource(R.string.profile_athlete_hr_max), stringResource(R.string.profile_value_bpm, it)) }
                profile.hrRest?.let { LabeledRow(stringResource(R.string.profile_athlete_hr_rest), stringResource(R.string.profile_value_bpm, it)) }
                profile.ftpWatts?.let { LabeledRow(stringResource(R.string.profile_athlete_ftp), stringResource(R.string.profile_value_watts, it)) }
            }

            CardBox(modifier = Modifier.clickable(onClick = onNavigateToGoals)) {
                Text(stringResource(R.string.profile_goals_title), style = MaterialTheme.typography.titleMedium)
                if (goals.isEmpty()) {
                    Text(stringResource(R.string.profile_goals_manage))
                } else {
                    Text(stringResource(R.string.profile_goals_manage_count, goals.size))
                    val primary = goals.firstOrNull { it.priority == GoalPriority.A } ?: goals.first()
                    Text(
                        "${primary.type.label} — ${formatFullDate(primary.targetDate)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            CardBox {
                Text(stringResource(R.string.profile_integrations_title), style = MaterialTheme.typography.titleMedium)
                StravaConnectSection(container)
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                HealthConnectSection(container)
            }

            Button(
                onClick = { scope.launch { onSignOut() } },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.profile_sign_out))
            }
        }
    }
}

@Composable
private fun LabeledRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value)
    }
}
