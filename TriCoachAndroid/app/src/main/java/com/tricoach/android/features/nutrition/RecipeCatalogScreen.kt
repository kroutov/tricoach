package com.tricoach.android.features.nutrition

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.app.AppContainer
import com.tricoach.android.core.network.apiValue
import com.tricoach.android.features.shared.RecipeRow
import com.tricoach.android.features.shared.SingleSelectDropdown
import com.tricoach.android.models.DietaryTag
import com.tricoach.android.models.MealType
import com.tricoach.android.models.Recipe
import com.tricoach.android.models.RecipeCategory
import com.tricoach.android.models.label

/** Plain state holder — search + 3 filters, refetches whenever any of them change. */
class RecipeCatalogState(private val container: AppContainer) {
    var recipes: List<Recipe> by mutableStateOf(emptyList())
        private set
    var isLoading by mutableStateOf(true)
        private set
    var errorMessage by mutableStateOf<String?>(null)
    var search by mutableStateOf("")
    var mealTypeFilter by mutableStateOf<MealType?>(null)
    var dietaryTagFilter by mutableStateOf<DietaryTag?>(null)
    var categoryFilter by mutableStateOf<RecipeCategory?>(null)

    suspend fun load() {
        isLoading = true
        errorMessage = null
        try {
            recipes = container.nutritionApi.fetchRecipes(
                mealType = mealTypeFilter?.apiValue(),
                dietaryTag = dietaryTagFilter?.apiValue(),
                category = categoryFilter?.apiValue(),
                search = search.ifBlank { null },
            )
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.recipe_catalog_error_load_failed, e.message)
        } finally {
            isLoading = false
        }
    }
}

/** Recipe browsing tab — search + meal/dietary/category filters, tap a row to view full detail. Mirrors iOS's RecipeCatalogView. */
@Composable
fun RecipeCatalogScreen(container: AppContainer, onRecipeClick: (Recipe) -> Unit) {
    val state = remember { RecipeCatalogState(container) }

    LaunchedEffect(state.search, state.mealTypeFilter, state.dietaryTagFilter, state.categoryFilter) {
        state.load()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = state.search,
                onValueChange = { state.search = it },
                label = { Text(stringResource(R.string.recipe_catalog_search_label)) },
                modifier = Modifier.fillMaxWidth(),
            )
            SingleSelectDropdown(
                label = stringResource(R.string.recipe_catalog_filter_meal_type),
                options = MealType.entries,
                selected = state.mealTypeFilter,
                optionLabel = { it?.label ?: stringResource(R.string.recipe_catalog_filter_all) },
                onSelect = { state.mealTypeFilter = it },
                modifier = Modifier.fillMaxWidth(),
            )
            SingleSelectDropdown(
                label = stringResource(R.string.recipe_catalog_filter_dietary_tag),
                options = DietaryTag.entries,
                selected = state.dietaryTagFilter,
                optionLabel = { it?.label ?: stringResource(R.string.recipe_catalog_filter_all) },
                onSelect = { state.dietaryTagFilter = it },
                modifier = Modifier.fillMaxWidth(),
            )
            SingleSelectDropdown(
                label = stringResource(R.string.recipe_catalog_filter_category),
                options = RecipeCategory.entries,
                selected = state.categoryFilter,
                optionLabel = { it?.label ?: stringResource(R.string.recipe_catalog_filter_all) },
                onSelect = { state.categoryFilter = it },
                modifier = Modifier.fillMaxWidth(),
            )
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            when {
                state.isLoading -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                state.errorMessage != null -> Text(state.errorMessage!!, color = MaterialTheme.colorScheme.error)
                state.recipes.isEmpty() -> Text(
                    stringResource(R.string.recipe_catalog_empty_state),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                else -> state.recipes.forEach { recipe ->
                    RecipeRow(recipe = recipe, onClick = { onRecipeClick(recipe) })
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}
