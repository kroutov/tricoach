package com.tricoach.android.features.nutrition

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.tricoach.android.R
import com.tricoach.android.app.AppContainer
import com.tricoach.android.core.network.ConfirmWeekRequest
import com.tricoach.android.core.network.SetMenuSelectionRequest
import com.tricoach.android.core.network.apiValue
import com.tricoach.android.features.shared.CardBox
import com.tricoach.android.features.shared.DateNavHeader
import com.tricoach.android.features.shared.RecipeRow
import com.tricoach.android.features.shared.addDays
import com.tricoach.android.features.shared.formatWeekRangeParts
import com.tricoach.android.features.shared.formatWeekdayDate
import com.tricoach.android.features.shared.mondayOfWeek
import com.tricoach.android.features.shared.parseIsoDate
import com.tricoach.android.models.MealType
import com.tricoach.android.models.MenuSelection
import com.tricoach.android.models.MenuSelectionStatus
import com.tricoach.android.models.Recipe
import com.tricoach.android.models.kcalPerServing
import com.tricoach.android.models.label
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private val weekRangeDayFormatter = DateTimeFormatter.ofPattern("d MMM", Locale.getDefault())

private data class PendingSlot(val date: LocalDate, val mealType: MealType)

/** Plain state holder — independent week-navigation state from GroceryListScreen. */
class WeeklyMenuState(private val container: AppContainer) {
    var weekStart by mutableStateOf(mondayOfWeek(LocalDate.now()))
        private set
    var selections: List<MenuSelection> by mutableStateOf(emptyList())
        private set
    var isLoading by mutableStateOf(true)
        private set
    var errorMessage by mutableStateOf<String?>(null)
    var isConfirmingWeek by mutableStateOf(false)
        private set

    suspend fun load() {
        isLoading = true
        errorMessage = null
        try {
            selections = container.nutritionApi.fetchMenuSelections(weekStart.toString(), addDays(weekStart, 6).toString())
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.weekly_menu_error_load_failed, e.message)
        } finally {
            isLoading = false
        }
    }

    fun goToPreviousWeek() {
        weekStart = addDays(weekStart, -7)
    }

    fun goToNextWeek() {
        weekStart = addDays(weekStart, 7)
    }

    fun goToToday() {
        weekStart = mondayOfWeek(LocalDate.now())
    }

    /** Also used to confirm a single proposed slot: the backend's PUT always forces status=confirmed, so re-sending the same recipeId is how a lone slot gets validated (no dedicated single-slot-confirm endpoint exists). */
    suspend fun assignRecipe(date: LocalDate, mealType: MealType, recipeId: String) {
        errorMessage = null
        try {
            container.nutritionApi.setMenuSelection(date.toString(), mealType.apiValue(), SetMenuSelectionRequest(recipeId))
            load()
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.weekly_menu_error_save_failed, e.message)
        }
    }

    suspend fun removeSelection(date: LocalDate, mealType: MealType) {
        errorMessage = null
        try {
            container.nutritionApi.deleteMenuSelection(date.toString(), mealType.apiValue())
            load()
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.weekly_menu_error_remove_failed, e.message)
        }
    }

    suspend fun confirmWeek() {
        errorMessage = null
        isConfirmingWeek = true
        try {
            container.nutritionApi.confirmWeek(ConfirmWeekRequest(weekStart.toString()))
            load()
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.weekly_menu_error_confirm_failed, e.message)
        } finally {
            isConfirmingWeek = false
        }
    }
}

/** 7-day × 4-meal grid for the current week — mirrors iOS's WeeklyMenuView. Empty/change slot picking is a local dialog (see RecipePickerDialog), not a nav push to the Recipes tab. */
@Composable
fun WeeklyMenuScreen(container: AppContainer) {
    val state = remember { WeeklyMenuState(container) }
    val scope = rememberCoroutineScope()
    var viewingSlot by remember { mutableStateOf<PendingSlot?>(null) }
    var pickingSlot by remember { mutableStateOf<PendingSlot?>(null) }

    LaunchedEffect(state.weekStart) { state.load() }

    val selectionsByKey = remember(state.selections) {
        state.selections.associateBy { parseIsoDate(it.date) to it.mealType }
    }
    val proposedCount = state.selections.count { it.status == MenuSelectionStatus.PROPOSED }

    Column(modifier = Modifier.fillMaxSize()) {
        val (rangeStartPart, rangeEndPart) = formatWeekRangeParts(state.weekStart, addDays(state.weekStart, 6))
        DateNavHeader(
            rangeLabel = "${state.weekStart.format(weekRangeDayFormatter)} – ${addDays(state.weekStart, 6).format(weekRangeDayFormatter)}",
            todayLabel = stringResource(R.string.weekly_menu_today),
            onPrevious = { state.goToPreviousWeek() },
            onNext = { state.goToNextWeek() },
            onToday = { state.goToToday() },
            isOnToday = state.weekStart == mondayOfWeek(LocalDate.now()),
            currentPeriodLabel = stringResource(R.string.weekly_menu_current_week_range, rangeStartPart, rangeEndPart),
            modifier = Modifier.padding(vertical = 8.dp),
        )

        if (proposedCount > 0) {
            CardBox(modifier = Modifier.padding(horizontal = 16.dp)) {
                Text(pluralStringResource(R.plurals.weekly_menu_proposed_count, proposedCount, proposedCount))
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { scope.launch { state.confirmWeek() } },
                    enabled = !state.isConfirmingWeek,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (state.isConfirmingWeek) "…" else stringResource(R.string.weekly_menu_confirm_all))
                }
            }
            Spacer(Modifier.height(8.dp))
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        ) {
            when {
                state.isLoading -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                state.errorMessage != null -> Text(state.errorMessage!!, color = MaterialTheme.colorScheme.error)
                else -> {
                    val days = (0..6).map { addDays(state.weekStart, it.toLong()) }
                    days.forEach { day ->
                        Text(
                            formatWeekdayDate(day),
                            style = MaterialTheme.typography.titleSmall,
                            modifier = Modifier.padding(top = 12.dp, bottom = 4.dp),
                        )
                        MealType.entries.forEach { mealType ->
                            val selection = selectionsByKey[day to mealType]
                            if (selection != null) {
                                FilledSlotRow(selection = selection, onClick = { viewingSlot = PendingSlot(day, mealType) })
                            } else {
                                EmptySlotRow(mealType = mealType, onClick = { pickingSlot = PendingSlot(day, mealType) })
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }

    viewingSlot?.let { slot ->
        val selection = selectionsByKey[slot.date to slot.mealType]
        if (selection != null) {
            SlotDetailDialog(
                selection = selection,
                onDismiss = { viewingSlot = null },
                onConfirm = { scope.launch { state.assignRecipe(slot.date, slot.mealType, selection.recipe.id); viewingSlot = null } },
                onChange = { viewingSlot = null; pickingSlot = slot },
                onRemove = { scope.launch { state.removeSelection(slot.date, slot.mealType); viewingSlot = null } },
            )
        }
    }

    pickingSlot?.let { slot ->
        RecipePickerDialog(
            container = container,
            mealType = slot.mealType,
            onDismiss = { pickingSlot = null },
            onPick = { recipe -> scope.launch { state.assignRecipe(slot.date, slot.mealType, recipe.id); pickingSlot = null } },
        )
    }
}

@Composable
private fun FilledSlotRow(selection: MenuSelection, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(selection.mealType.label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(selection.recipe.title, style = MaterialTheme.typography.bodyMedium)
            selection.recipe.kcalPerServing()?.let {
                Text("$it kcal", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        if (selection.status == MenuSelectionStatus.PROPOSED) {
            Text(
                stringResource(R.string.enum_menu_status_proposed),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}

@Composable
private fun EmptySlotRow(mealType: MealType, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            mealType.label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f),
        )
        Text("+", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
    }
}

@Composable
private fun SlotDetailDialog(
    selection: MenuSelection,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
    onChange: () -> Unit,
    onRemove: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(selection.recipe.title) },
        text = {
            val kcalSuffix = selection.recipe.kcalPerServing()?.let { " · $it kcal" } ?: ""
            Text("${selection.mealType.label} · ${selection.recipe.effortProfile.label}$kcalSuffix")
        },
        confirmButton = {
            Row {
                if (selection.status == MenuSelectionStatus.PROPOSED) {
                    TextButton(onClick = onConfirm) { Text(stringResource(R.string.weekly_menu_action_confirm)) }
                }
                TextButton(onClick = onChange) { Text(stringResource(R.string.weekly_menu_action_change)) }
            }
        },
        dismissButton = { TextButton(onClick = onRemove) { Text(stringResource(R.string.weekly_menu_action_remove)) } },
    )
}

@Composable
private fun RecipePickerDialog(container: AppContainer, mealType: MealType, onDismiss: () -> Unit, onPick: (Recipe) -> Unit) {
    var recipes by remember { mutableStateOf<List<Recipe>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(mealType) {
        isLoading = true
        recipes = runCatching { container.nutritionApi.fetchRecipes(mealType = mealType.apiValue()) }.getOrDefault(emptyList())
        isLoading = false
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surface) {
            Column(modifier = Modifier.padding(16.dp).heightIn(max = 480.dp)) {
                Text(stringResource(R.string.weekly_menu_picker_title), style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                when {
                    isLoading -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                    recipes.isEmpty() -> Text(
                        stringResource(R.string.weekly_menu_picker_empty),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    else -> Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                        recipes.forEach { recipe -> RecipeRow(recipe = recipe, onClick = { onPick(recipe) }) }
                    }
                }
            }
        }
    }
}
