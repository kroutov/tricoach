package com.tricoach.android.features.nutrition

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.features.shared.formatQuantity
import com.tricoach.android.models.Recipe
import com.tricoach.android.models.kcalPerServing
import com.tricoach.android.models.label
import kotlin.math.roundToInt

/** Full recipe view — ingredients + instructions + effort/prep-time/servings badges. Reached only from RecipeCatalogScreen, mirrors WorkoutDetailScreen's push-with-selected-object pattern (no re-fetch by id). */
@Composable
fun RecipeDetailScreen(recipe: Recipe, onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.padding(8.dp)) {
            IconButton(onClick = onBack) { Text("←", style = MaterialTheme.typography.headlineSmall) }
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        ) {
            Text(recipe.title, style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                DetailPill(recipe.effortProfile.label)
                DetailPill(recipe.prepTime.label)
                DetailPill(stringResource(R.string.recipe_detail_servings, recipe.servings))
                recipe.kcalPerServing()?.let { DetailPill(stringResource(R.string.recipe_detail_kcal, it)) }
            }
            Spacer(Modifier.height(16.dp))

            if (recipe.proteins != null || recipe.carbs != null || recipe.fat != null || recipe.fiber != null || recipe.salt != null) {
                Text(stringResource(R.string.recipe_detail_nutrition_title), style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(4.dp))
                val perServing = { total: Double -> (total / recipe.servings) }
                val lines = listOfNotNull(
                    recipe.proteins?.let { stringResource(R.string.recipe_detail_nutrition_proteins, perServing(it).roundToInt()) },
                    recipe.carbs?.let { stringResource(R.string.recipe_detail_nutrition_carbs, perServing(it).roundToInt()) },
                    recipe.fat?.let { stringResource(R.string.recipe_detail_nutrition_fat, perServing(it).roundToInt()) },
                    recipe.fiber?.let { stringResource(R.string.recipe_detail_nutrition_fiber, perServing(it).roundToInt()) },
                    recipe.salt?.let { stringResource(R.string.recipe_detail_nutrition_salt, formatQuantity(perServing(it))) },
                )
                Text(lines.joinToString(" · "), style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(16.dp))
            }

            Text(stringResource(R.string.recipe_detail_ingredients_title), style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(4.dp))
            recipe.ingredients.forEach { ingredient ->
                val quantity = ingredient.amount?.let { amount ->
                    listOfNotNull(formatQuantity(amount), ingredient.unit).joinToString(" ") + " "
                } ?: ""
                Text(
                    "$quantity${ingredient.name}",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(vertical = 2.dp),
                )
            }
            Spacer(Modifier.height(16.dp))

            Text(stringResource(R.string.recipe_detail_instructions_title), style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(4.dp))
            Text(recipe.instructions, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun DetailPill(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f), RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}
