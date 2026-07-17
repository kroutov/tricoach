package com.tricoach.android.models

/** French display labels for domain enums — mirrors the `label` computed properties on TriCoachAI's Swift enums. */
val Sex.label: String
    get() = when (this) {
        Sex.MALE -> "Homme"
        Sex.FEMALE -> "Femme"
        Sex.OTHER -> "Autre"
    }

val AthleteLevel.label: String
    get() = when (this) {
        AthleteLevel.BEGINNER -> "Débutant"
        AthleteLevel.INTERMEDIATE -> "Intermédiaire"
        AthleteLevel.ADVANCED -> "Avancé"
    }

val AthleteLevel.description: String
    get() = when (this) {
        AthleteLevel.BEGINNER -> "Vous découvrez ce sport ou reprenez après une longue pause."
        AthleteLevel.INTERMEDIATE -> "Vous vous entraînez régulièrement depuis plus d'un an."
        AthleteLevel.ADVANCED -> "Vous avez déjà bouclé des courses et structurez votre entraînement."
    }

val GoalType.label: String
    get() = when (this) {
        GoalType.TRIATHLON_SPRINT -> "Triathlon Sprint"
        GoalType.TRIATHLON_OLYMPIC -> "Triathlon Olympique"
        GoalType.DUATHLON -> "Duathlon"
        GoalType.RUN_10K -> "10 km"
        GoalType.HALF_MARATHON -> "Semi-marathon"
        GoalType.MARATHON -> "Marathon"
        GoalType.IRONMAN -> "Ironman"
        GoalType.HALF_IRONMAN -> "Semi-Ironman (70.3)"
        GoalType.IMPROVE_VMA -> "Améliorer sa VMA"
        GoalType.WEIGHT_LOSS -> "Perdre du poids"
        GoalType.GENERAL_ENDURANCE -> "Améliorer l'endurance"
    }

val GoalPriority.label: String
    get() = "Priorité $name"

val TimeSlot.label: String
    get() = when (this) {
        TimeSlot.EARLY_MORNING -> "Tôt le matin (avant 7h)"
        TimeSlot.MORNING -> "Matin"
        TimeSlot.LUNCH -> "Pause déjeuner"
        TimeSlot.AFTERNOON -> "Après-midi"
        TimeSlot.EVENING -> "Soir"
    }

val SportType.label: String
    get() = when (this) {
        SportType.RUN -> "Course à pied"
        SportType.BIKE -> "Vélo"
        SportType.SWIM -> "Natation"
        SportType.BRICK -> "Enchaînement (brick)"
        SportType.STRENGTH -> "Renforcement"
        SportType.REST -> "Repos"
    }

val WorkoutIntensity.label: String
    get() = when (this) {
        WorkoutIntensity.EASY -> "Facile"
        WorkoutIntensity.MODERATE -> "Modérée"
        WorkoutIntensity.HARD -> "Difficile"
    }

val AdaptationTrigger.label: String
    get() = when (this) {
        AdaptationTrigger.MISSED_WORKOUT -> "Séance ratée"
        AdaptationTrigger.OVERPERFORMANCE -> "Surperformance"
        AdaptationTrigger.UNDERPERFORMANCE -> "Sous-performance"
        AdaptationTrigger.HIGH_FATIGUE -> "Fatigue élevée"
        AdaptationTrigger.INJURY_FLAG -> "Alerte blessure"
        AdaptationTrigger.LOW_RECOVERY -> "Récupération faible"
        AdaptationTrigger.PHYSIOLOGICAL_STRAIN -> "Dérive cardiaque"
    }

val MacrocyclePhase.label: String
    get() = when (this) {
        MacrocyclePhase.BASE -> "Base"
        MacrocyclePhase.BUILD -> "Développement"
        MacrocyclePhase.PEAK -> "Affûtage spécifique"
        MacrocyclePhase.TAPER -> "Affûtage final"
        MacrocyclePhase.TRANSITION -> "Transition"
    }

/** Calendar-style weekday numbering (Sunday=1...Saturday=7), ordered Monday-first for display — mirrors iOS's Weekday enum. */
object Weekday {
    val orderedWeek = listOf(2, 3, 4, 5, 6, 7, 1)

    fun label(day: Int): String = when (day) {
        2 -> "Lundi"
        3 -> "Mardi"
        4 -> "Mercredi"
        5 -> "Jeudi"
        6 -> "Vendredi"
        7 -> "Samedi"
        1 -> "Dimanche"
        else -> "?"
    }

    fun narrowLabel(day: Int): String = label(day).take(1)
}
