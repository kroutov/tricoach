package com.tricoach.android.features.onboarding.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import com.tricoach.android.features.shared.DoubleStepperField
import com.tricoach.android.features.shared.IntStepperField
import com.tricoach.android.features.shared.OnboardingField
import com.tricoach.android.models.ConstraintCheckIn

@Composable
fun ConstraintsStep(checkIn: ConstraintCheckIn, onChange: (ConstraintCheckIn) -> Unit) {
    var newInjury by remember { mutableStateOf("") }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(stringResource(R.string.onboarding_constraints_title), style = MaterialTheme.typography.headlineSmall)
        Text(
            stringResource(R.string.onboarding_constraints_hint),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        OnboardingField(stringResource(R.string.onboarding_constraints_injuries)) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                checkIn.injuries.forEach { injury ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(injury, modifier = Modifier.weight(1f))
                        TextButton(onClick = { onChange(checkIn.copy(injuries = checkIn.injuries - injury)) }) { Text(stringResource(R.string.onboarding_constraints_remove_injury)) }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = newInjury,
                        onValueChange = { newInjury = it },
                        label = { Text(stringResource(R.string.onboarding_constraints_injury_placeholder)) },
                        modifier = Modifier.weight(1f),
                    )
                    Button(onClick = {
                        if (newInjury.isNotBlank()) {
                            onChange(checkIn.copy(injuries = checkIn.injuries + newInjury.trim()))
                            newInjury = ""
                        }
                    }) { Text(stringResource(R.string.onboarding_constraints_add_injury)) }
                }
            }
        }

        IntStepperField(
            label = stringResource(R.string.onboarding_constraints_fatigue_level),
            value = checkIn.fatigueLevel,
            onValueChange = { onChange(checkIn.copy(fatigueLevel = it)) },
            range = 1..5,
            valueLabel = { stringResource(R.string.onboarding_constraints_level_value, it) },
        )

        IntStepperField(
            label = stringResource(R.string.onboarding_constraints_stress_level),
            value = checkIn.stressLevel,
            onValueChange = { onChange(checkIn.copy(stressLevel = it)) },
            range = 1..5,
            valueLabel = { stringResource(R.string.onboarding_constraints_level_value, it) },
        )

        DoubleStepperField(
            label = stringResource(R.string.onboarding_constraints_avg_sleep),
            value = checkIn.sleepHours,
            onValueChange = { onChange(checkIn.copy(sleepHours = it)) },
            range = 3.0..11.0,
            step = 0.5,
            valueLabel = { stringResource(R.string.onboarding_constraints_avg_sleep_value, it) },
        )
    }
}
