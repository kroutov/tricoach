package com.tricoach.android.features.onboarding.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.tricoach.android.features.shared.DoubleStepperField
import com.tricoach.android.features.shared.IntStepperField
import com.tricoach.android.models.AthleteProfile

@Composable
fun HistoryStep(profile: AthleteProfile, onChange: (AthleteProfile) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Votre historique", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Ces données personnalisent vos zones d'entraînement. Laissez vide si inconnu — vous pourrez les compléter plus tard.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        DoubleStepperField(
            label = "Années de pratique",
            value = profile.yearsPractice ?: 1.0,
            onValueChange = { onChange(profile.copy(yearsPractice = it)) },
            range = 0.0..40.0,
            step = 0.5,
            valueLabel = { "%.1f ans".format(it) },
        )

        IntStepperField(
            label = "Volume hebdomadaire moyen",
            value = profile.weeklyVolumeAvgMin ?: 180,
            onValueChange = { onChange(profile.copy(weeklyVolumeAvgMin = it)) },
            range = 0..1200,
            step = 15,
            valueLabel = { "$it min / semaine" },
        )

        IntStepperField(
            label = "Fréquence cardiaque max (bpm)",
            value = profile.hrMax ?: 185,
            onValueChange = { onChange(profile.copy(hrMax = it)) },
            range = 120..230,
            valueLabel = { "$it bpm" },
        )

        IntStepperField(
            label = "Fréquence cardiaque au repos (bpm)",
            value = profile.hrRest ?: 55,
            onValueChange = { onChange(profile.copy(hrRest = it)) },
            range = 30..100,
            valueLabel = { "$it bpm" },
        )

        IntStepperField(
            label = "FTP vélo (watts, si connu)",
            value = profile.ftpWatts ?: 200,
            onValueChange = { onChange(profile.copy(ftpWatts = it)) },
            range = 0..500,
            step = 5,
            valueLabel = { v -> if (profile.ftpWatts != null) "$v W" else "Non renseigné" },
        )

        IntStepperField(
            label = "Allure seuil course (min/km, si connue)",
            value = profile.thresholdPaceSecPerKm ?: 300,
            onValueChange = { onChange(profile.copy(thresholdPaceSecPerKm = it)) },
            range = 150..600,
            step = 5,
            valueLabel = { v -> if (profile.thresholdPaceSecPerKm != null) "${paceLabel(v)} /km" else "Non renseignée" },
        )

        IntStepperField(
            label = "CSS natation (min/100m, si connue)",
            value = profile.cssPaceSecPer100m ?: 100,
            onValueChange = { onChange(profile.copy(cssPaceSecPer100m = it)) },
            range = 50..240,
            valueLabel = { v -> if (profile.cssPaceSecPer100m != null) "${paceLabel(v)} /100m" else "Non renseignée" },
        )
    }
}

private fun paceLabel(seconds: Int): String = "${seconds / 60}:${(seconds % 60).toString().padStart(2, '0')}"
