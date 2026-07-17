package com.tricoach.android.features.calendar

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.tricoach.android.app.AppContainer
import com.tricoach.android.features.shared.parseIsoDate
import com.tricoach.android.models.Microcycle
import com.tricoach.android.models.TrainingPlan
import com.tricoach.android.models.Workout
import java.time.LocalDate
import java.time.YearMonth

/** Plain state holder (not a ViewModel) — mirrors iOS's CalendarViewModel, minus drag & drop reschedule (Android Phase 1 reschedules from the Workout Detail screen via a date stepper instead, see plan). */
class CalendarState(private val container: AppContainer) {
    var plan by mutableStateOf<TrainingPlan?>(null)
        private set
    var isLoading by mutableStateOf(true)
        private set
    var selectedDate by mutableStateOf(LocalDate.now())
    var displayedMonth by mutableStateOf(YearMonth.now())

    suspend fun refresh() {
        isLoading = true
        plan = runCatching { container.planRepository.fetchActivePlan() }.getOrNull()
        isLoading = false
    }

    fun workouts(date: LocalDate): List<Workout> =
        plan?.allWorkouts?.filter { parseIsoDate(it.date) == date } ?: emptyList()

    val selectedDayWorkouts: List<Workout>
        get() = workouts(date = selectedDate).sortedBy { it.date }

    fun microcycle(date: LocalDate): Microcycle? {
        val p = plan ?: return null
        return p.macrocycles.flatMap { it.mesocycles }.flatMap { it.microcycles }
            .firstOrNull { date >= parseIsoDate(it.startDate) && date <= parseIsoDate(it.endDate) }
    }

    /** Full Monday-first weeks spanning displayedMonth — mirrors iOS's monthGridDates, but java.time's DayOfWeek is already ISO (Monday=1...Sunday=7) so no manual offset math is needed. */
    val monthGridDates: List<LocalDate>
        get() {
            val first = displayedMonth.atDay(1)
            val last = displayedMonth.atEndOfMonth()
            val gridStart = first.minusDays((first.dayOfWeek.value - 1).toLong())
            val gridEnd = last.plusDays((7 - last.dayOfWeek.value).toLong())
            val dates = mutableListOf<LocalDate>()
            var cursor = gridStart
            while (!cursor.isAfter(gridEnd)) {
                dates.add(cursor)
                cursor = cursor.plusDays(1)
            }
            return dates
        }

    val canGoToPreviousMonth: Boolean
        get() {
            val start = plan?.startDate?.let { YearMonth.from(parseIsoDate(it)) } ?: return true
            return displayedMonth > start
        }

    val canGoToNextMonth: Boolean
        get() {
            val end = plan?.endDate?.let { YearMonth.from(parseIsoDate(it)) } ?: return true
            return displayedMonth < end
        }

    fun goToPreviousMonth() {
        displayedMonth = displayedMonth.minusMonths(1)
    }

    fun goToNextMonth() {
        displayedMonth = displayedMonth.plusMonths(1)
    }

    fun goToToday() {
        selectedDate = LocalDate.now()
        displayedMonth = YearMonth.now()
    }

    fun selectDay(date: LocalDate) {
        selectedDate = date
        if (YearMonth.from(date) != displayedMonth) displayedMonth = YearMonth.from(date)
    }
}
