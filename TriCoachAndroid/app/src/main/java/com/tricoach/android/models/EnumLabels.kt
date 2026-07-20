package com.tricoach.android.models

import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringArrayResource
import androidx.compose.ui.res.stringResource
import com.tricoach.android.R

/**
 * Display labels for domain enums, localized via string resources (values/values-en).
 * Each enum gets a plain `labelResId()` (callable anywhere, including non-Composable
 * state holders that resolve it via `container.context.getString(...)`) plus a
 * `@Composable get()` wrapper that preserves the existing `enum.label` property-access
 * syntax at the ~50+ Composable call sites — mirrors the `label` computed properties on
 * TriCoachAI's Swift enums.
 */
@StringRes
fun Sex.labelResId(): Int = when (this) {
    Sex.MALE -> R.string.enum_sex_male
    Sex.FEMALE -> R.string.enum_sex_female
    Sex.OTHER -> R.string.enum_sex_other
}

val Sex.label: String
    @Composable get() = stringResource(labelResId())

@StringRes
fun AthleteLevel.labelResId(): Int = when (this) {
    AthleteLevel.BEGINNER -> R.string.enum_athlete_level_beginner
    AthleteLevel.INTERMEDIATE -> R.string.enum_athlete_level_intermediate
    AthleteLevel.ADVANCED -> R.string.enum_athlete_level_advanced
}

val AthleteLevel.label: String
    @Composable get() = stringResource(labelResId())

@StringRes
fun AthleteLevel.descriptionResId(): Int = when (this) {
    AthleteLevel.BEGINNER -> R.string.enum_athlete_level_description_beginner
    AthleteLevel.INTERMEDIATE -> R.string.enum_athlete_level_description_intermediate
    AthleteLevel.ADVANCED -> R.string.enum_athlete_level_description_advanced
}

val AthleteLevel.description: String
    @Composable get() = stringResource(descriptionResId())

@StringRes
fun GoalType.labelResId(): Int = when (this) {
    GoalType.TRIATHLON_SPRINT -> R.string.enum_goal_type_triathlon_sprint
    GoalType.TRIATHLON_OLYMPIC -> R.string.enum_goal_type_triathlon_olympic
    GoalType.DUATHLON -> R.string.enum_goal_type_duathlon
    GoalType.RUN_10K -> R.string.enum_goal_type_run_10k
    GoalType.HALF_MARATHON -> R.string.enum_goal_type_half_marathon
    GoalType.MARATHON -> R.string.enum_goal_type_marathon
    GoalType.IRONMAN -> R.string.enum_goal_type_ironman
    GoalType.HALF_IRONMAN -> R.string.enum_goal_type_half_ironman
    GoalType.IMPROVE_VMA -> R.string.enum_goal_type_improve_vma
    GoalType.WEIGHT_LOSS -> R.string.enum_goal_type_weight_loss
    GoalType.GENERAL_ENDURANCE -> R.string.enum_goal_type_general_endurance
}

val GoalType.label: String
    @Composable get() = stringResource(labelResId())

val GoalPriority.label: String
    @Composable get() = stringResource(R.string.enum_goal_priority_label, name)

@StringRes
fun TimeSlot.labelResId(): Int = when (this) {
    TimeSlot.EARLY_MORNING -> R.string.enum_time_slot_early_morning
    TimeSlot.MORNING -> R.string.enum_time_slot_morning
    TimeSlot.LUNCH -> R.string.enum_time_slot_lunch
    TimeSlot.AFTERNOON -> R.string.enum_time_slot_afternoon
    TimeSlot.EVENING -> R.string.enum_time_slot_evening
}

val TimeSlot.label: String
    @Composable get() = stringResource(labelResId())

@StringRes
fun SportType.labelResId(): Int = when (this) {
    SportType.RUN -> R.string.enum_sport_type_run
    SportType.BIKE -> R.string.enum_sport_type_bike
    SportType.SWIM -> R.string.enum_sport_type_swim
    SportType.BRICK -> R.string.enum_sport_type_brick
    SportType.STRENGTH -> R.string.enum_sport_type_strength
    SportType.REST -> R.string.enum_sport_type_rest
}

val SportType.label: String
    @Composable get() = stringResource(labelResId())

@StringRes
fun WorkoutIntensity.labelResId(): Int = when (this) {
    WorkoutIntensity.EASY -> R.string.enum_workout_intensity_easy
    WorkoutIntensity.MODERATE -> R.string.enum_workout_intensity_moderate
    WorkoutIntensity.HARD -> R.string.enum_workout_intensity_hard
}

val WorkoutIntensity.label: String
    @Composable get() = stringResource(labelResId())

@StringRes
fun AdaptationTrigger.labelResId(): Int = when (this) {
    AdaptationTrigger.MISSED_WORKOUT -> R.string.enum_adaptation_trigger_missed_workout
    AdaptationTrigger.OVERPERFORMANCE -> R.string.enum_adaptation_trigger_overperformance
    AdaptationTrigger.UNDERPERFORMANCE -> R.string.enum_adaptation_trigger_underperformance
    AdaptationTrigger.HIGH_FATIGUE -> R.string.enum_adaptation_trigger_high_fatigue
    AdaptationTrigger.INJURY_FLAG -> R.string.enum_adaptation_trigger_injury_flag
    AdaptationTrigger.LOW_RECOVERY -> R.string.enum_adaptation_trigger_low_recovery
    AdaptationTrigger.PHYSIOLOGICAL_STRAIN -> R.string.enum_adaptation_trigger_physiological_strain
}

val AdaptationTrigger.label: String
    @Composable get() = stringResource(labelResId())

@StringRes
fun MacrocyclePhase.labelResId(): Int = when (this) {
    MacrocyclePhase.BASE -> R.string.enum_macrocycle_phase_base
    MacrocyclePhase.BUILD -> R.string.enum_macrocycle_phase_build
    MacrocyclePhase.PEAK -> R.string.enum_macrocycle_phase_peak
    MacrocyclePhase.TAPER -> R.string.enum_macrocycle_phase_taper
    MacrocyclePhase.TRANSITION -> R.string.enum_macrocycle_phase_transition
}

val MacrocyclePhase.label: String
    @Composable get() = stringResource(labelResId())

@StringRes
fun ActivitySource.labelResId(): Int = when (this) {
    ActivitySource.HEALTH_KIT -> R.string.enum_activity_source_health_kit
    ActivitySource.STRAVA -> R.string.enum_activity_source_strava
    ActivitySource.MANUAL -> R.string.enum_activity_source_manual
    ActivitySource.GARMIN -> R.string.enum_activity_source_garmin
    ActivitySource.HEALTH_CONNECT -> R.string.enum_activity_source_health_connect
}

val ActivitySource.label: String
    @Composable get() = stringResource(labelResId())

/** Calendar-style weekday numbering (Sunday=1...Saturday=7), ordered Monday-first for display — mirrors iOS's Weekday enum. */
object Weekday {
    val orderedWeek = listOf(2, 3, 4, 5, 6, 7, 1)

    @StringRes
    fun labelResId(day: Int): Int = when (day) {
        2 -> R.string.enum_weekday_monday
        3 -> R.string.enum_weekday_tuesday
        4 -> R.string.enum_weekday_wednesday
        5 -> R.string.enum_weekday_thursday
        6 -> R.string.enum_weekday_friday
        7 -> R.string.enum_weekday_saturday
        1 -> R.string.enum_weekday_sunday
        else -> R.string.enum_weekday_unknown
    }

    @Composable
    fun label(day: Int): String = stringResource(labelResId(day))

    /** Explicit per-locale abbreviations rather than label(day).take(1) — a first-letter derivation works for French's 7 distinct initials but collides in English (Tue/Thu both "T", Sat/Sun both "S"). */
    @Composable
    fun narrowLabel(day: Int): String {
        val index = orderedWeek.indexOf(day).coerceAtLeast(0)
        return stringArrayResource(R.array.weekday_narrow).getOrElse(index) { "?" }
    }
}
