package com.tricoach.android.models

import kotlinx.serialization.Serializable

@Serializable
data class MenuSelection(
    val id: String,
    val date: String,
    val mealType: MealType,
    val status: MenuSelectionStatus,
    val recipe: Recipe,
)
