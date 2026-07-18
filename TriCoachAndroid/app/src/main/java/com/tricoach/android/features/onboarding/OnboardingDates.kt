package com.tricoach.android.features.onboarding

import com.tricoach.android.features.shared.parseIsoDate
import java.time.LocalDate
import java.time.temporal.ChronoUnit

/**
 * Android Phase 1 picks a goal's target date via a "weeks from now" stepper
 * rather than a full calendar UI (iOS uses a native DatePicker) — same
 * outcome, simpler control. [dateStringWeeksFromNow]/[weeksFromNow] convert
 * between that stepper value and the ISO date string the backend expects.
 *
 * A goal's targetDate is plain yyyy-MM-dd when freshly drafted on-device
 * (see [dateStringWeeksFromNow]) but comes back as a full ISO instant once
 * round-tripped through the server (Date.toISOString()) — [parseIsoDate]
 * tolerates both, unlike a bare LocalDate.parse.
 */
fun dateStringWeeksFromNow(weeks: Int): String = LocalDate.now().plusWeeks(weeks.toLong()).toString()

fun weeksFromNow(dateIso: String): Int {
    val target = parseIsoDate(dateIso)
    return ChronoUnit.WEEKS.between(LocalDate.now(), target).toInt().coerceIn(1, 208)
}
