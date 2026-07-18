package com.tricoach.android.features.onboarding.steps

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.features.shared.ChipGroup
import com.tricoach.android.features.shared.IntStepperField
import com.tricoach.android.features.shared.OnboardingField
import com.tricoach.android.models.Availability
import com.tricoach.android.models.TimeSlot
import com.tricoach.android.models.Weekday
import com.tricoach.android.models.label

@Composable
fun AvailabilityStep(availability: Availability, onChange: (Availability) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(stringResource(R.string.onboarding_availability_title), style = MaterialTheme.typography.headlineSmall)

        IntStepperField(
            label = stringResource(R.string.onboarding_availability_sessions_per_week),
            value = availability.sessionsPerWeek,
            onValueChange = { onChange(availability.copy(sessionsPerWeek = it)) },
            range = 1..14,
            valueLabel = { pluralStringResource(R.plurals.plural_sessions_per_week, it, it) },
        )

        IntStepperField(
            label = stringResource(R.string.onboarding_availability_max_duration),
            value = availability.maxSessionDurationMin,
            onValueChange = { onChange(availability.copy(maxSessionDurationMin = it)) },
            range = 20..240,
            step = 5,
            valueLabel = { stringResource(R.string.onboarding_availability_max_duration_value, it) },
        )

        OnboardingField(stringResource(R.string.onboarding_availability_available_days)) {
            ChipGroup(
                items = Weekday.orderedWeek,
                selected = availability.availableDays,
                label = { Weekday.label(it) },
                onToggle = { day -> onChange(availability.copy(availableDays = availability.availableDays.toggled(day))) },
            )
        }

        OnboardingField(stringResource(R.string.onboarding_availability_preferred_time_slots)) {
            ChipGroup(
                items = TimeSlot.entries,
                selected = availability.preferredTimeSlots,
                label = { it.label },
                onToggle = { slot -> onChange(availability.copy(preferredTimeSlots = availability.preferredTimeSlots.toggled(slot))) },
            )
        }

        OnboardingField(stringResource(R.string.onboarding_availability_mandatory_rest_days)) {
            ChipGroup(
                items = Weekday.orderedWeek,
                selected = availability.mandatoryRestDays,
                label = { Weekday.label(it) },
                onToggle = { day -> onChange(availability.copy(mandatoryRestDays = availability.mandatoryRestDays.toggled(day))) },
            )
        }
    }
}

private fun <T> List<T>.toggled(item: T): List<T> = if (contains(item)) this - item else this + item
