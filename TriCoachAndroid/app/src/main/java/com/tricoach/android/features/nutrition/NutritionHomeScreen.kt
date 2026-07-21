package com.tricoach.android.features.nutrition

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.app.AppContainer
import com.tricoach.android.models.Recipe

private enum class NutritionTab { MENU, RECIPES, GROCERIES }

/** Nutrition tab shell — segmented Menu/Recettes/Courses picker inside a single bottom-nav tab, mirrors iOS's NutritionHomeView (avoids spending 3 tab-bar slots on it). */
@Composable
fun NutritionHomeScreen(container: AppContainer, onRecipeClick: (Recipe) -> Unit) {
    var tab by remember { mutableStateOf(NutritionTab.MENU) }

    Column(modifier = Modifier.fillMaxSize()) {
        Text(stringResource(R.string.nutrition_home_title), style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(16.dp))

        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
            SegmentedButton(
                selected = tab == NutritionTab.MENU,
                onClick = { tab = NutritionTab.MENU },
                shape = SegmentedButtonDefaults.itemShape(0, 3),
            ) { Text(stringResource(R.string.nutrition_home_tab_menu)) }
            SegmentedButton(
                selected = tab == NutritionTab.RECIPES,
                onClick = { tab = NutritionTab.RECIPES },
                shape = SegmentedButtonDefaults.itemShape(1, 3),
            ) { Text(stringResource(R.string.nutrition_home_tab_recipes)) }
            SegmentedButton(
                selected = tab == NutritionTab.GROCERIES,
                onClick = { tab = NutritionTab.GROCERIES },
                shape = SegmentedButtonDefaults.itemShape(2, 3),
            ) { Text(stringResource(R.string.nutrition_home_tab_groceries)) }
        }

        Spacer(Modifier.height(8.dp))

        when (tab) {
            NutritionTab.MENU -> WeeklyMenuScreen(container)
            NutritionTab.RECIPES -> RecipeCatalogScreen(container, onRecipeClick = onRecipeClick)
            NutritionTab.GROCERIES -> GroceryListScreen(container)
        }
    }
}
