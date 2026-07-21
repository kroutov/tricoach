package com.tricoach.android.features.shared

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.util.Locale

/** Backend dates are full ISO8601 instants (Node's Date.toISOString(), always with milliseconds) — java.time.Instant.parse handles that natively, no custom formatter needed (unlike iOS's ISO8601DateFormatter, see JSONCoding.swift). */
fun parseIsoDate(iso: String): LocalDate =
    runCatching { Instant.parse(iso).atZone(ZoneOffset.UTC).toLocalDate() }
        .getOrElse { runCatching { LocalDate.parse(iso) }.getOrElse { LocalDate.now() } }

private val monthYearFormatter = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.getDefault())

fun formatMonthYear(month: YearMonth): String =
    month.atDay(1).format(monthYearFormatter).replaceFirstChar { it.uppercase() }

private val fullDateFormatter = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.getDefault())

fun formatFullDate(iso: String): String = parseIsoDate(iso).format(fullDateFormatter)

/** "5:03" style pace label from a seconds count — shared by threshold-pace, CSS, and workout target-zone displays. */
fun paceLabel(seconds: Int): String = "${seconds / 60}:${(seconds % 60).toString().padStart(2, '0')}"

/** Monday of the week containing `date` — the week-navigation anchor shared by WeeklyMenuScreen and GroceryListScreen, mirrors web's dateOnly.ts mondayOfWeek. */
fun mondayOfWeek(date: LocalDate): LocalDate = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

fun addDays(date: LocalDate, amount: Long): LocalDate = date.plusDays(amount)

private val weekdayDateFormatter = DateTimeFormatter.ofPattern("EEEE d MMM", Locale.getDefault())

/** e.g. "lundi 20 juil." / "Monday 20 Jul" — weekday name is locale-aware natively via the EEEE pattern, no string-resource mapping needed. */
fun formatWeekdayDate(date: LocalDate): String = date.format(weekdayDateFormatter).replaceFirstChar { it.uppercase() }
