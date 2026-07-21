package com.tricoach.android.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class Sex {
    @SerialName("male") MALE,
    @SerialName("female") FEMALE,
    @SerialName("other") OTHER,
}

@Serializable
enum class AthleteLevel {
    @SerialName("beginner") BEGINNER,
    @SerialName("intermediate") INTERMEDIATE,
    @SerialName("advanced") ADVANCED,
}

@Serializable
enum class GoalType {
    @SerialName("triathlonSprint") TRIATHLON_SPRINT,
    @SerialName("triathlonOlympic") TRIATHLON_OLYMPIC,
    @SerialName("duathlon") DUATHLON,
    @SerialName("run10k") RUN_10K,
    @SerialName("halfMarathon") HALF_MARATHON,
    @SerialName("marathon") MARATHON,
    @SerialName("ironman") IRONMAN,
    @SerialName("halfIronman") HALF_IRONMAN,
    @SerialName("improveVMA") IMPROVE_VMA,
    @SerialName("weightLoss") WEIGHT_LOSS,
    @SerialName("generalEndurance") GENERAL_ENDURANCE,
}

@Serializable
enum class GoalPriority {
    @SerialName("a") A,
    @SerialName("b") B,
    @SerialName("c") C,
}

@Serializable
enum class GoalStatus {
    @SerialName("active") ACTIVE,
    @SerialName("achieved") ACHIEVED,
    @SerialName("abandoned") ABANDONED,
}

@Serializable
enum class TimeSlot {
    @SerialName("earlyMorning") EARLY_MORNING,
    @SerialName("morning") MORNING,
    @SerialName("lunch") LUNCH,
    @SerialName("afternoon") AFTERNOON,
    @SerialName("evening") EVENING,
}

@Serializable
enum class WorkoutIntensity {
    @SerialName("easy") EASY,
    @SerialName("moderate") MODERATE,
    @SerialName("hard") HARD,
}

@Serializable
enum class WorkoutStatus {
    @SerialName("planned") PLANNED,
    @SerialName("completed") COMPLETED,
    @SerialName("skipped") SKIPPED,
    @SerialName("modified") MODIFIED,
}

@Serializable
enum class SportType {
    @SerialName("run") RUN,
    @SerialName("bike") BIKE,
    @SerialName("swim") SWIM,
    @SerialName("brick") BRICK,
    @SerialName("strength") STRENGTH,
    @SerialName("rest") REST,
}

@Serializable
enum class AdaptationTrigger {
    @SerialName("missedWorkout") MISSED_WORKOUT,
    @SerialName("overperformance") OVERPERFORMANCE,
    @SerialName("underperformance") UNDERPERFORMANCE,
    @SerialName("highFatigue") HIGH_FATIGUE,
    @SerialName("injuryFlag") INJURY_FLAG,
    @SerialName("lowRecovery") LOW_RECOVERY,
    @SerialName("physiologicalStrain") PHYSIOLOGICAL_STRAIN,
}

@Serializable
enum class MacrocyclePhase {
    @SerialName("base") BASE,
    @SerialName("build") BUILD,
    @SerialName("peak") PEAK,
    @SerialName("taper") TAPER,
    @SerialName("transition") TRANSITION,
}

@Serializable
enum class PlanStatus {
    @SerialName("draft") DRAFT,
    @SerialName("active") ACTIVE,
    @SerialName("completed") COMPLETED,
    @SerialName("archived") ARCHIVED,
}

@Serializable
enum class ActivitySource {
    @SerialName("healthKit") HEALTH_KIT,
    @SerialName("strava") STRAVA,
    @SerialName("manual") MANUAL,
    @SerialName("garmin") GARMIN,
    @SerialName("healthConnect") HEALTH_CONNECT,
}

@Serializable
enum class MealType {
    @SerialName("breakfast") BREAKFAST,
    @SerialName("lunch") LUNCH,
    @SerialName("dinner") DINNER,
    @SerialName("snack") SNACK,
}

@Serializable
enum class DietaryTag {
    @SerialName("vegetarian") VEGETARIAN,
    @SerialName("chickenOnly") CHICKEN_ONLY,
    @SerialName("pescatarian") PESCATARIAN,
    @SerialName("omnivore") OMNIVORE,
}

@Serializable
enum class EffortProfile {
    @SerialName("carbLoad") CARB_LOAD,
    @SerialName("recovery") RECOVERY,
    @SerialName("light") LIGHT,
    @SerialName("balanced") BALANCED,
}

@Serializable
enum class RecipeCategory {
    @SerialName("dips") DIPS,
    @SerialName("cookies") COOKIES,
    @SerialName("ovenBaked") OVEN_BAKED,
    @SerialName("stew") STEW,
    @SerialName("sandwich") SANDWICH,
    @SerialName("dessert") DESSERT,
    @SerialName("toast") TOAST,
    @SerialName("salad") SALAD,
    @SerialName("pie") PIE,
    @SerialName("vegetarian") VEGETARIAN,
    @SerialName("cake") CAKE,
    @SerialName("pasta") PASTA,
    @SerialName("soup") SOUP,
}

@Serializable
enum class PrepTimeBucket {
    @SerialName("under15") UNDER_15,
    @SerialName("min15to30") MIN_15_TO_30,
    @SerialName("min30to45") MIN_30_TO_45,
    @SerialName("min45to60") MIN_45_TO_60,
    @SerialName("over60") OVER_60,
}

@Serializable
enum class GroceryAisle {
    @SerialName("butcher") BUTCHER,
    @SerialName("bakery") BAKERY,
    @SerialName("grocery") GROCERY,
    @SerialName("produce") PRODUCE,
    @SerialName("fishmonger") FISHMONGER,
    @SerialName("fresh") FRESH,
    @SerialName("frozen") FROZEN,
}

@Serializable
enum class MenuSelectionStatus {
    @SerialName("proposed") PROPOSED,
    @SerialName("confirmed") CONFIRMED,
}
