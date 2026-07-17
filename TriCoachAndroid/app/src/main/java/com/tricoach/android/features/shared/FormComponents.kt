package com.tricoach.android.features.shared

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/** Shared label+control card used across onboarding, workout detail, etc. — mirrors iOS's OnboardingField. */
@Composable
fun OnboardingField(label: String, content: @Composable () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
            .padding(12.dp),
    ) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(6.dp))
        content()
    }
}

@Composable
fun IntStepperField(
    label: String,
    value: Int,
    onValueChange: (Int) -> Unit,
    range: IntRange,
    step: Int = 1,
    valueLabel: (Int) -> String = { it.toString() },
) {
    OnboardingField(label) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedButton(onClick = { onValueChange((value - step).coerceIn(range)) }) { Text("−") }
            Text(valueLabel(value), style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
            OutlinedButton(onClick = { onValueChange((value + step).coerceIn(range)) }) { Text("+") }
        }
    }
}

@Composable
fun DoubleStepperField(
    label: String,
    value: Double,
    onValueChange: (Double) -> Unit,
    range: ClosedFloatingPointRange<Double>,
    step: Double = 1.0,
    valueLabel: (Double) -> String = { it.toString() },
) {
    OnboardingField(label) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedButton(onClick = { onValueChange((value - step).coerceIn(range)) }) { Text("−") }
            Text(valueLabel(value), style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
            OutlinedButton(onClick = { onValueChange((value + step).coerceIn(range)) }) { Text("+") }
        }
    }
}

/** Multi-select chip grid — mirrors iOS's ChipGrid used for weekday/time-slot selection. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun <T> ChipGroup(items: List<T>, selected: List<T>, label: (T) -> String, onToggle: (T) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items.forEach { item ->
            val isSelected = selected.contains(item)
            FilterChip(selected = isSelected, onClick = { onToggle(item) }, label = { Text(label(item)) })
        }
    }
}
