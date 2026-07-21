package com.tricoach.android.models

import kotlinx.serialization.Serializable

@Serializable
data class RecipeIngredient(
    val id: String,
    val name: String,
    val amount: Double? = null,
    val unit: String? = null,
    val aisle: GroceryAisle? = null,
)

@Serializable
data class Recipe(
    val id: String,
    val title: String,
    val mealTypes: List<MealType> = emptyList(),
    val categories: List<RecipeCategory> = emptyList(),
    val dietaryTags: List<DietaryTag> = emptyList(),
    val effortProfile: EffortProfile,
    val prepTime: PrepTimeBucket,
    val servings: Int,
    val instructions: String,
    val ingredients: List<RecipeIngredient> = emptyList(),
)
