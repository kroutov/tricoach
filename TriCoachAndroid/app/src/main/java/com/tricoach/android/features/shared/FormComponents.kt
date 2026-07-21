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
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
    valueLabel: @Composable (Int) -> String = { it.toString() },
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
    valueLabel: @Composable (Double) -> String = { it.toString() },
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

/** Single-select "Tous"-or-one-option dropdown — mirrors iOS's Picker filters on RecipeCatalogView (meal type/dietary tag/category). `null` in [options]/[selected]/[onSelect] represents the "all" option. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun <T> SingleSelectDropdown(
    label: String,
    options: List<T>,
    selected: T?,
    optionLabel: @Composable (T?) -> String,
    onSelect: (T?) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }, modifier = modifier) {
        OutlinedTextField(
            value = optionLabel(selected),
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(text = { Text(optionLabel(null)) }, onClick = { onSelect(null); expanded = false })
            options.forEach { option ->
                DropdownMenuItem(text = { Text(optionLabel(option)) }, onClick = { onSelect(option); expanded = false })
            }
        }
    }
}

/** Multi-select chip grid — mirrors iOS's ChipGrid used for weekday/time-slot selection. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun <T> ChipGroup(items: List<T>, selected: List<T>, label: @Composable (T) -> String, onToggle: (T) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items.forEach { item ->
            val isSelected = selected.contains(item)
            FilterChip(selected = isSelected, onClick = { onToggle(item) }, label = { Text(label(item)) })
        }
    }
}
