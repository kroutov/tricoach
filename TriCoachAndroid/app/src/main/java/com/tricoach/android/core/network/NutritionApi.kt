package com.tricoach.android.core.network

import com.tricoach.android.models.DietaryTag
import com.tricoach.android.models.MealType
import com.tricoach.android.models.MenuSelection
import com.tricoach.android.models.Recipe
import com.tricoach.android.models.RecipeCategory
import com.tricoach.android.models.ShoppingListResponse
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

@Serializable
data class SetMenuSelectionRequest(val recipeId: String)

@Serializable
data class ConfirmWeekRequest(val weekStart: String)

@Serializable
data class ConfirmWeekResponse(val confirmed: Int)

/**
 * Retrofit @Query/@Path parameters serialize via toString(), not through the
 * kotlinx.serialization body converter (that only applies to @Body) — so
 * passing an enum directly would send its Kotlin name ("BREAKFAST") instead
 * of the backend's camelCase wire value ("breakfast"). These map each enum
 * to its exact wire string; call sites pass the result, and NutritionApi's
 * @Query/@Path parameters stay typed String.
 */
fun MealType.apiValue(): String = when (this) {
    MealType.BREAKFAST -> "breakfast"
    MealType.LUNCH -> "lunch"
    MealType.DINNER -> "dinner"
    MealType.SNACK -> "snack"
}

fun DietaryTag.apiValue(): String = when (this) {
    DietaryTag.VEGETARIAN -> "vegetarian"
    DietaryTag.CHICKEN_ONLY -> "chickenOnly"
    DietaryTag.PESCATARIAN -> "pescatarian"
    DietaryTag.OMNIVORE -> "omnivore"
}

fun RecipeCategory.apiValue(): String = when (this) {
    RecipeCategory.DIPS -> "dips"
    RecipeCategory.COOKIES -> "cookies"
    RecipeCategory.OVEN_BAKED -> "ovenBaked"
    RecipeCategory.STEW -> "stew"
    RecipeCategory.SANDWICH -> "sandwich"
    RecipeCategory.DESSERT -> "dessert"
    RecipeCategory.TOAST -> "toast"
    RecipeCategory.SALAD -> "salad"
    RecipeCategory.PIE -> "pie"
    RecipeCategory.VEGETARIAN -> "vegetarian"
    RecipeCategory.CAKE -> "cake"
    RecipeCategory.PASTA -> "pasta"
    RecipeCategory.SOUP -> "soup"
}

interface NutritionApi {
    @GET("nutrition/recipes")
    suspend fun fetchRecipes(
        @Query("mealType") mealType: String? = null,
        @Query("dietaryTag") dietaryTag: String? = null,
        @Query("category") category: String? = null,
        @Query("search") search: String? = null,
    ): List<Recipe>

    @GET("me/nutrition/menu")
    suspend fun fetchMenuSelections(@Query("from") from: String, @Query("to") to: String): List<MenuSelection>

    @PUT("me/nutrition/menu/{date}/{mealType}")
    suspend fun setMenuSelection(
        @Path("date") date: String,
        @Path("mealType") mealType: String,
        @Body body: SetMenuSelectionRequest,
    ): MenuSelection

    @DELETE("me/nutrition/menu/{date}/{mealType}")
    suspend fun deleteMenuSelection(@Path("date") date: String, @Path("mealType") mealType: String)

    @POST("me/nutrition/menu/confirm-week")
    suspend fun confirmWeek(@Body body: ConfirmWeekRequest): ConfirmWeekResponse

    @GET("me/nutrition/menu/shopping-list")
    suspend fun fetchShoppingList(@Query("from") from: String, @Query("to") to: String): ShoppingListResponse
}
