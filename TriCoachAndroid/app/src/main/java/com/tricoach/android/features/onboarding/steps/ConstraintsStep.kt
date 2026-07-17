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
import androidx.compose.ui.unit.dp
import com.tricoach.android.features.shared.DoubleStepperField
import com.tricoach.android.features.shared.IntStepperField
import com.tricoach.android.features.shared.OnboardingField
import com.tricoach.android.models.ConstraintCheckIn

@Composable
fun ConstraintsStep(checkIn: ConstraintCheckIn, onChange: (ConstraintCheckIn) -> Unit) {
    var newInjury by remember { mutableStateOf("") }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Contraintes actuelles", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Ces informations permettent au moteur d'adaptation de rester prudent dès la première semaine.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        OnboardingField("Blessures éventuelles") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                checkIn.injuries.forEach { injury ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(injury, modifier = Modifier.weight(1f))
                        TextButton(onClick = { onChange(checkIn.copy(injuries = checkIn.injuries - injury)) }) { Text("Retirer") }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = newInjury,
                        onValueChange = { newInjury = it },
                        label = { Text("Ex : douleur genou droit") },
                        modifier = Modifier.weight(1f),
                    )
                    Button(onClick = {
                        if (newInjury.isNotBlank()) {
                            onChange(checkIn.copy(injuries = checkIn.injuries + newInjury.trim()))
                            newInjury = ""
                        }
                    }) { Text("Ajouter") }
                }
            }
        }

        IntStepperField(
            label = "Niveau de fatigue (1 = très frais, 5 = épuisé)",
            value = checkIn.fatigueLevel,
            onValueChange = { onChange(checkIn.copy(fatigueLevel = it)) },
            range = 1..5,
            valueLabel = { "$it / 5" },
        )

        IntStepperField(
            label = "Niveau de stress (1 = détendu, 5 = très stressé)",
            value = checkIn.stressLevel,
            onValueChange = { onChange(checkIn.copy(stressLevel = it)) },
            range = 1..5,
            valueLabel = { "$it / 5" },
        )

        DoubleStepperField(
            label = "Sommeil moyen",
            value = checkIn.sleepHours,
            onValueChange = { onChange(checkIn.copy(sleepHours = it)) },
            range = 3.0..11.0,
            step = 0.5,
            valueLabel = { "%.1f h / nuit".format(it) },
        )
    }
}
