package com.tricoach.android.features.shared

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/**
 * Shared date-paging header for Calendar/WeeklyMenu/GroceryList. "Today" is pinned to its own
 * fixed top-right row, decoupled from the prev/next chevrons — mirrors Apple/Google Calendar's
 * persistent Today button rather than a label squeezed between the paging arrows and the range
 * text, which is what made the old per-screen headers feel cramped and inconsistent.
 *
 * When [currentPeriodLabel] is set and [isOnToday] is true, that slot shows a plain (non-clickable)
 * marker for the displayed period instead of a disabled "Today" button — there's nothing to jump to
 * when you're already there, so the space is better spent confirming which period is on screen.
 */
@Composable
fun DateNavHeader(
    rangeLabel: String,
    todayLabel: String,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onToday: () -> Unit,
    isOnToday: Boolean,
    modifier: Modifier = Modifier,
    canGoPrevious: Boolean = true,
    canGoNext: Boolean = true,
    currentPeriodLabel: String? = null,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp), horizontalArrangement = Arrangement.End) {
            if (isOnToday && currentPeriodLabel != null) {
                Text(
                    currentPeriodLabel,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            } else {
                TextButton(onClick = onToday, enabled = !isOnToday) { Text(todayLabel) }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextButton(onClick = onPrevious, enabled = canGoPrevious) { Text("‹") }
            Text(rangeLabel, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
            TextButton(onClick = onNext, enabled = canGoNext) { Text("›") }
        }
    }
}
