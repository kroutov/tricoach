package com.tricoach.android.features.integrations

import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.tricoach.android.R
import com.tricoach.android.app.AppContainer
import com.tricoach.android.core.network.StravaStatusResponse
import com.tricoach.android.features.shared.formatFullDate
import kotlinx.coroutines.launch

/**
 * Plain state holder (not a ViewModel) — mirrors iOS's StravaConnectViewModel,
 * but the completion signal differs: iOS's ASWebAuthenticationSession returns
 * control directly, whereas a Custom Tab does not, so this relies on
 * [StravaConnectSection] re-calling [refresh] on every app-resume instead.
 */
class StravaConnectState(private val container: AppContainer) {
    var status by mutableStateOf<StravaStatusResponse?>(null)
        private set
    var isLoading by mutableStateOf(true)
        private set
    var isSyncing by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
    var syncMessage by mutableStateOf<String?>(null)

    suspend fun refresh() {
        isLoading = true
        status = runCatching { container.integrationsApi.stravaStatus() }.getOrNull()
        isLoading = false
    }

    suspend fun connect(launchAuthUrl: (String) -> Unit) {
        errorMessage = null
        try {
            val response = container.integrationsApi.stravaAuthUrl()
            launchAuthUrl(response.url)
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.strava_error_connect_failed, e.message)
        }
    }

    suspend fun disconnect() {
        errorMessage = null
        try {
            container.integrationsApi.disconnectStrava()
            refresh()
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.strava_error_disconnect_failed, e.message)
        }
    }

    suspend fun sync() {
        errorMessage = null
        syncMessage = null
        isSyncing = true
        try {
            val result = container.integrationsApi.syncStrava()
            syncMessage = container.context.resources.getQuantityString(
                R.plurals.plural_activities_imported,
                result.activitiesIngested,
                result.activitiesIngested,
            )
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.strava_error_sync_failed, e.message)
        } finally {
            isSyncing = false
        }
    }
}

/** Strava row — mirrors iOS's StravaConnectSection, embedded in ProfileScreen's "Intégrations" card (see plan §3a). */
@Composable
fun StravaConnectSection(container: AppContainer) {
    val state = remember { StravaConnectState(container) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    LaunchedEffect(Unit) { state.refresh() }

    // Custom Tabs give no callback when they close, so re-check status
    // whenever the app returns to the foreground — the deliberate compromise
    // documented in the Phase 2 plan (no APP_SCHEME deep link resurrection).
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                scope.launch { state.refresh() }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    Column {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Strava", style = MaterialTheme.typography.titleMedium)
                val status = state.status
                val connectedSinceSuffix = status?.connectedAt?.let {
                    stringResource(R.string.strava_connected_since_suffix, formatFullDate(it))
                } ?: ""
                val statusText = when {
                    state.isLoading -> stringResource(R.string.strava_status_loading)
                    status?.connected == true -> stringResource(R.string.strava_status_connected) + connectedSinceSuffix
                    else -> stringResource(R.string.strava_status_not_connected)
                }
                Text(statusText, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (state.status?.connected == true) {
                TextButton(onClick = { scope.launch { state.sync() } }, enabled = !state.isSyncing) {
                    Text(if (state.isSyncing) "…" else stringResource(R.string.strava_action_resync))
                }
                TextButton(onClick = { scope.launch { state.disconnect() } }) { Text(stringResource(R.string.strava_action_disconnect)) }
            } else {
                Button(onClick = {
                    scope.launch {
                        state.connect { url ->
                            CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
                        }
                    }
                }) { Text(stringResource(R.string.strava_action_connect)) }
            }
        }
        state.syncMessage?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
        }
        state.errorMessage?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }
    }
}
