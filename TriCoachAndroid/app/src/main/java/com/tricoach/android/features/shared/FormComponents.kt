package com.tricoach.android.features.shared

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
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

/** Fixed-size +/- button — unweighted OutlinedButtons default to a 58dp min width plus wide content padding, which starves the value label when a stepper is squeezed into half a row (e.g. the Heures/Minutes pair in GoalEditor.kt). */
@Composable
private fun StepperButton(symbol: String, onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, contentPadding = PaddingValues(0.dp), modifier = Modifier.size(36.dp)) {
        Text(symbol)
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
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StepperButton("−") { onValueChange((value - step).coerceIn(range)) }
            Text(
                valueLabel(value),
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(1f),
            )
            StepperButton("+") { onValueChange((value + step).coerceIn(range)) }
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
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StepperButton("−") { onValueChange((value - step).coerceIn(range)) }
            Text(
                valueLabel(value),
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(1f),
            )
            StepperButton("+") { onValueChange((value + step).coerceIn(range)) }
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
