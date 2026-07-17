package com.tricoach.android.features.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tricoach.android.app.AppContainer
import com.tricoach.android.features.shared.WorkoutRow
import com.tricoach.android.features.shared.formatMonthYear
import com.tricoach.android.models.Microcycle
import com.tricoach.android.models.Weekday
import com.tricoach.android.models.Workout
import java.time.LocalDate
import java.time.YearMonth

/** Mirrors iOS's CalendarView: month header, Monday-first grid, then the selected day's workouts — no drag & drop in Phase 1 (see plan, deferred to a later phase). */
@Composable
fun CalendarScreen(container: AppContainer, onWorkoutClick: (Workout) -> Unit) {
    val state = remember { CalendarState(container) }

    LaunchedEffect(Unit) { state.refresh() }

    Column(modifier = Modifier.fillMaxSize()) {
        Text("Calendrier", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(16.dp, 16.dp, 16.dp, 8.dp))

        MonthHeader(
            state = state,
            onPrevious = { state.goToPreviousMonth() },
            onNext = { state.goToNextMonth() },
            onToday = { state.goToToday() },
        )

        WeekdayHeaderRow()

        MonthGrid(state = state, onSelectDay = { state.selectDay(it) })

        state.microcycle(date = state.selectedDate)?.let { microcycle ->
            MicrocycleBanner(microcycle)
        }

        val dayWorkouts = state.selectedDayWorkouts
        if (dayWorkouts.isEmpty()) {
            Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Journée de repos", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Aucune séance planifiée ce jour.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                dayWorkouts.forEach { workout ->
                    WorkoutRow(workout = workout, onClick = { onWorkoutClick(workout) })
                }
            }
        }
    }
}

@Composable
private fun MonthHeader(state: CalendarState, onPrevious: () -> Unit, onNext: () -> Unit, onToday: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TextButton(onClick = onPrevious, enabled = state.canGoToPreviousMonth) { Text("‹") }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(formatMonthYear(state.displayedMonth), style = MaterialTheme.typography.titleMedium)
            TextButton(onClick = onToday) { Text("Aujourd'hui", style = MaterialTheme.typography.labelMedium) }
        }
        TextButton(onClick = onNext, enabled = state.canGoToNextMonth) { Text("›") }
    }
}

@Composable
private fun WeekdayHeaderRow() {
    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        Weekday.orderedWeek.forEach { day ->
            Text(
                Weekday.narrowLabel(day),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun MonthGrid(state: CalendarState, onSelectDay: (LocalDate) -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        state.monthGridDates.chunked(7).forEach { week ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                week.forEach { date ->
                    MonthDayCell(
                        date = date,
                        isSelected = date == state.selectedDate,
                        isToday = date == LocalDate.now(),
                        isCurrentMonth = YearMonth.from(date) == state.displayedMonth,
                        hasWorkout = state.workouts(date = date).isNotEmpty(),
                        onSelect = { onSelectDay(date) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun MonthDayCell(
    date: LocalDate,
    isSelected: Boolean,
    isToday: Boolean,
    isCurrentMonth: Boolean,
    hasWorkout: Boolean,
    onSelect: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val background = if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surface
    val textColor = when {
        isSelected -> MaterialTheme.colorScheme.primary
        isCurrentMonth -> MaterialTheme.colorScheme.onSurface
        else -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
    }
    Column(
        modifier = modifier
            .aspectRatio(1f)
            .clip(RoundedCornerShape(8.dp))
            .background(background)
            .clickable(onClick = onSelect),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(date.dayOfMonth.toString(), style = MaterialTheme.typography.bodyMedium, color = textColor)
        if (hasWorkout) {
            Box(
                modifier = Modifier
                    .padding(top = 2.dp)
                    .size(5.dp)
                    .background(MaterialTheme.colorScheme.primary, CircleShape),
            )
        }
    }
}

@Composable
private fun MicrocycleBanner(microcycle: Microcycle) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            "Semaine ${microcycle.weekNumber}" + if (microcycle.isRecoveryWeek) " · allégée" else "",
            style = MaterialTheme.typography.labelMedium,
        )
        Text(
            "${microcycle.plannedLoad.toInt()} TSS planifiés",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
