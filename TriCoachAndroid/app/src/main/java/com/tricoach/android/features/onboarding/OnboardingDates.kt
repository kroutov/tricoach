package com.tricoach.android.features.onboarding

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale

private val targetDateFormatter = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.FRENCH)

/**
 * Android Phase 1 picks a goal's target date via a "weeks from now" stepper
 * rather than a full calendar UI (iOS uses a native DatePicker) — same
 * outcome, simpler control. [dateStringWeeksFromNow]/[weeksFromNow] convert
 * between that stepper value and the ISO date string the backend expects.
 */
fun dateStringWeeksFromNow(weeks: Int): String = LocalDate.now().plusWeeks(weeks.toLong()).toString()

fun weeksFromNow(dateIso: String): Int {
    val target = runCatching { LocalDate.parse(dateIso) }.getOrDefault(LocalDate.now())
    return ChronoUnit.WEEKS.between(LocalDate.now(), target).toInt().coerceIn(1, 208)
}

fun formatTargetDate(dateIso: String): String =
    runCatching { LocalDate.parse(dateIso).format(targetDateFormatter) }.getOrDefault(dateIso)
