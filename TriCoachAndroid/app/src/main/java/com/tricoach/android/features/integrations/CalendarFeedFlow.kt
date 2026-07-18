package com.tricoach.android.features.integrations

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.app.AppContainer
import com.tricoach.android.core.network.CalendarTokenResponse
import com.tricoach.android.features.shared.CardBox
import kotlinx.coroutines.launch

/** Plain state holder for the read-only ICS calendar-feed subscription card — mirrors web's calendarTokenQuery/rotateCalendarTokenMutation. */
class CalendarFeedState(private val container: AppContainer) {
    var token by mutableStateOf<CalendarTokenResponse?>(null)
        private set
    var isLoading by mutableStateOf(true)
        private set
    var isRotating by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)

    suspend fun load() {
        isLoading = true
        errorMessage = null
        try {
            token = container.userApiClient.fetchCalendarToken()
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.calendar_feed_error_load_failed, e.message)
        } finally {
            isLoading = false
        }
    }

    suspend fun rotate() {
        isRotating = true
        errorMessage = null
        try {
            token = container.userApiClient.rotateCalendarToken()
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.calendar_feed_error_load_failed, e.message)
        } finally {
            isRotating = false
        }
    }
}

/** Read-only iCal subscription link — mirrors Web's "Abonnement calendrier" card (Google Calendar/Apple Calendar/any iCal client can subscribe). Not built on iOS. */
@Composable
fun CalendarFeedSection(container: AppContainer) {
    val state = remember { CalendarFeedState(container) }
    val scope = rememberCoroutineScope()
    val clipboard = LocalClipboardManager.current

    LaunchedEffect(Unit) { state.load() }

    CardBox {
        Text(stringResource(R.string.calendar_feed_title), style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(4.dp))
        Text(
            stringResource(R.string.calendar_feed_description),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        val token = state.token
        when {
            state.isLoading -> {
                Spacer(Modifier.height(8.dp))
                CircularProgressIndicator(modifier = Modifier.size(20.dp))
            }
            token != null -> {
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = token.url,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text(stringResource(R.string.calendar_feed_url_label)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth()) {
                    TextButton(onClick = { clipboard.setText(AnnotatedString(token.url)) }, modifier = Modifier.weight(1f)) {
                        Text(stringResource(R.string.calendar_feed_copy_link))
                    }
                    TextButton(
                        onClick = { scope.launch { state.rotate() } },
                        enabled = !state.isRotating,
                        modifier = Modifier.weight(1f),
                    ) {
                        Text(stringResource(R.string.calendar_feed_regenerate_link))
                    }
                }
            }
        }
        state.errorMessage?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }
    }
}
