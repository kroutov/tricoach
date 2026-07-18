package com.tricoach.android.features.onboarding.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.features.shared.DoubleStepperField
import com.tricoach.android.features.shared.IntStepperField
import com.tricoach.android.models.AthleteProfile

@Composable
fun HistoryStep(profile: AthleteProfile, onChange: (AthleteProfile) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(stringResource(R.string.onboarding_history_title), style = MaterialTheme.typography.headlineSmall)
        Text(
            stringResource(R.string.onboarding_history_hint),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        DoubleStepperField(
            label = stringResource(R.string.onboarding_history_years_practice),
            value = profile.yearsPractice ?: 1.0,
            onValueChange = { onChange(profile.copy(yearsPractice = it)) },
            range = 0.0..40.0,
            step = 0.5,
            valueLabel = { stringResource(R.string.onboarding_history_years_practice_value, it) },
        )

        IntStepperField(
            label = stringResource(R.string.onboarding_history_weekly_volume),
            value = profile.weeklyVolumeAvgMin ?: 180,
            onValueChange = { onChange(profile.copy(weeklyVolumeAvgMin = it)) },
            range = 0..1200,
            step = 15,
            valueLabel = { stringResource(R.string.onboarding_history_weekly_volume_value, it) },
        )

        IntStepperField(
            label = stringResource(R.string.onboarding_history_hr_max),
            value = profile.hrMax ?: 185,
            onValueChange = { onChange(profile.copy(hrMax = it)) },
            range = 120..230,
            valueLabel = { stringResource(R.string.onboarding_history_bpm_value, it) },
        )

        IntStepperField(
            label = stringResource(R.string.onboarding_history_hr_rest),
            value = profile.hrRest ?: 55,
            onValueChange = { onChange(profile.copy(hrRest = it)) },
            range = 30..100,
            valueLabel = { stringResource(R.string.onboarding_history_bpm_value, it) },
        )

        IntStepperField(
            label = stringResource(R.string.onboarding_history_ftp),
            value = profile.ftpWatts ?: 200,
            onValueChange = { onChange(profile.copy(ftpWatts = it)) },
            range = 0..500,
            step = 5,
            valueLabel = { v ->
                if (profile.ftpWatts != null) stringResource(R.string.onboarding_history_ftp_value, v) else stringResource(R.string.onboarding_history_not_provided_masc)
            },
        )

        IntStepperField(
            label = stringResource(R.string.onboarding_history_threshold_pace),
            value = profile.thresholdPaceSecPerKm ?: 300,
            onValueChange = { onChange(profile.copy(thresholdPaceSecPerKm = it)) },
            range = 150..600,
            step = 5,
            valueLabel = { v ->
                if (profile.thresholdPaceSecPerKm != null) {
                    stringResource(R.string.onboarding_history_threshold_pace_value, paceLabel(v))
                } else {
                    stringResource(R.string.onboarding_history_not_provided_fem)
                }
            },
        )

        IntStepperField(
            label = stringResource(R.string.onboarding_history_css_pace),
            value = profile.cssPaceSecPer100m ?: 100,
            onValueChange = { onChange(profile.copy(cssPaceSecPer100m = it)) },
            range = 50..240,
            valueLabel = { v ->
                if (profile.cssPaceSecPer100m != null) {
                    stringResource(R.string.onboarding_history_css_pace_value, paceLabel(v))
                } else {
                    stringResource(R.string.onboarding_history_not_provided_fem)
                }
            },
        )
    }
}

private fun paceLabel(seconds: Int): String = "${seconds / 60}:${(seconds % 60).toString().padStart(2, '0')}"
