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
    val kcal: Double? = null,
    val proteins: Double? = null,
    val carbs: Double? = null,
    val fat: Double? = null,
    val fiber: Double? = null,
    val salt: Double? = null,
)

/** Nutrition totals from the API are for the whole recipe (all servings) — divide down for a per-portion read. */
fun Recipe.kcalPerServing(): Int? = kcal?.let { Math.round(it / servings).toInt() }
