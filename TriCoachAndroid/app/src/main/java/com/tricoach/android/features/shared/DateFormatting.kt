package com.tricoach.android.features.shared

import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale

/** Backend dates are full ISO8601 instants (Node's Date.toISOString(), always with milliseconds) — java.time.Instant.parse handles that natively, no custom formatter needed (unlike iOS's ISO8601DateFormatter, see JSONCoding.swift). */
fun parseIsoDate(iso: String): LocalDate =
    runCatching { Instant.parse(iso).atZone(ZoneOffset.UTC).toLocalDate() }
        .getOrElse { runCatching { LocalDate.parse(iso) }.getOrElse { LocalDate.now() } }

private val monthYearFormatter = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.FRENCH)

fun formatMonthYear(month: YearMonth): String =
    month.atDay(1).format(monthYearFormatter).replaceFirstChar { it.uppercase() }

private val fullDateFormatter = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.FRENCH)

fun formatFullDate(iso: String): String = parseIsoDate(iso).format(fullDateFormatter)

/** "5:03" style pace label from a seconds count — shared by threshold-pace, CSS, and workout target-zone displays. */
fun paceLabel(seconds: Int): String = "${seconds / 60}:${(seconds % 60).toString().padStart(2, '0')}"
