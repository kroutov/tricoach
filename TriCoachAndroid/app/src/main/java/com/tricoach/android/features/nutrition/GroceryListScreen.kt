package com.tricoach.android.features.nutrition

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import com.tricoach.android.features.shared.CardBox
import com.tricoach.android.features.shared.addDays
import com.tricoach.android.features.shared.formatQuantity
import com.tricoach.android.features.shared.mondayOfWeek
import com.tricoach.android.models.ShoppingListResponse
import com.tricoach.android.models.label
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private val weekRangeDayFormatter = DateTimeFormatter.ofPattern("d MMM", Locale.getDefault())

/** Plain state holder — independent week-navigation state from WeeklyMenuScreen (viewing a different week in each is fine). */
class GroceryListState(private val container: AppContainer) {
    var weekStart by mutableStateOf(mondayOfWeek(LocalDate.now()))
        private set
    var shoppingList by mutableStateOf<ShoppingListResponse?>(null)
        private set
    var isLoading by mutableStateOf(true)
        private set
    var errorMessage by mutableStateOf<String?>(null)

    suspend fun load() {
        isLoading = true
        errorMessage = null
        try {
            shoppingList = container.nutritionApi.fetchShoppingList(weekStart.toString(), addDays(weekStart, 6).toString())
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.grocery_list_error_load_failed, e.message)
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
}

/** Read-only shopping list grouped by aisle — includes both proposed and confirmed menu selections for the week. Mirrors iOS's GroceryListView. */
@Composable
fun GroceryListScreen(container: AppContainer) {
    val state = remember { GroceryListState(container) }

    LaunchedEffect(state.weekStart) { state.load() }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextButton(onClick = { state.goToPreviousWeek() }) { Text("‹") }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "${state.weekStart.format(weekRangeDayFormatter)} – ${addDays(state.weekStart, 6).format(weekRangeDayFormatter)}",
                    style = MaterialTheme.typography.titleMedium,
                )
                TextButton(onClick = { state.goToToday() }) { Text(stringResource(R.string.grocery_list_today)) }
            }
            TextButton(onClick = { state.goToNextWeek() }) { Text("›") }
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            val list = state.shoppingList
            when {
                state.isLoading -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                state.errorMessage != null -> Text(state.errorMessage!!, color = MaterialTheme.colorScheme.error)
                list == null || list.aisles.all { it.items.isEmpty() } -> Text(
                    stringResource(R.string.grocery_list_empty_state),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                else -> list.aisles.filter { it.items.isNotEmpty() }.forEach { group ->
                    CardBox {
                        Text(
                            group.aisle?.label ?: stringResource(R.string.grocery_list_aisle_other),
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Spacer(Modifier.height(4.dp))
                        group.items.forEach { item ->
                            val amountSuffix = item.amount?.let {
                                " — " + listOfNotNull(formatQuantity(it), item.unit).joinToString(" ")
                            } ?: ""
                            Text("${item.name}$amountSuffix", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}
