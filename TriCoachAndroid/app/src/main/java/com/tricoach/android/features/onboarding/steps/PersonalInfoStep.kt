package com.tricoach.android.features.onboarding.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.features.shared.DoubleStepperField
import com.tricoach.android.features.shared.IntStepperField
import com.tricoach.android.features.shared.OnboardingField
import com.tricoach.android.models.AthleteProfile
import com.tricoach.android.models.Sex
import com.tricoach.android.models.label

@Composable
fun PersonalInfoStep(profile: AthleteProfile, onChange: (AthleteProfile) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(stringResource(R.string.onboarding_personal_info_title), style = MaterialTheme.typography.headlineSmall)

        IntStepperField(
            label = stringResource(R.string.onboarding_personal_info_age),
            value = profile.age ?: 30,
            onValueChange = { onChange(profile.copy(age = it)) },
            range = 12..100,
            valueLabel = { stringResource(R.string.onboarding_personal_info_age_value, it) },
        )

        OnboardingField(stringResource(R.string.onboarding_personal_info_sex)) {
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                Sex.entries.forEachIndexed { index, sex ->
                    SegmentedButton(
                        selected = (profile.sex ?: Sex.OTHER) == sex,
                        onClick = { onChange(profile.copy(sex = sex)) },
                        shape = SegmentedButtonDefaults.itemShape(index, Sex.entries.size),
                    ) { Text(sex.label) }
                }
            }
        }

        IntStepperField(
            label = stringResource(R.string.onboarding_personal_info_height),
            value = (profile.heightCm ?: 175.0).toInt(),
            onValueChange = { onChange(profile.copy(heightCm = it.toDouble())) },
            range = 120..230,
            valueLabel = { stringResource(R.string.onboarding_personal_info_height_value, it) },
        )

        DoubleStepperField(
            label = stringResource(R.string.onboarding_personal_info_weight),
            value = profile.weightKg ?: 70.0,
            onValueChange = { onChange(profile.copy(weightKg = it)) },
            range = 30.0..200.0,
            step = 0.5,
            valueLabel = { stringResource(R.string.onboarding_personal_info_weight_value, it) },
        )
    }
}
