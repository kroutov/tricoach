package com.tricoach.android.features.integrations

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
import com.tricoach.android.app.AppContainer
import com.tricoach.android.core.network.ApiException
import com.tricoach.android.core.network.GarminConnectRequest
import com.tricoach.android.core.network.StravaStatusResponse
import com.tricoach.android.core.network.apiCall
import com.tricoach.android.features.shared.formatFullDate
import kotlinx.coroutines.launch

/**
 * Plain state holder — mirrors StravaConnectState's shape, but there's no
 * OAuth round-trip: connect() posts the athlete's own Garmin username/password
 * directly (no authorization flow exists for Garmin — see backend's
 * garminClient.ts for the tradeoffs of the unofficial API this relies on).
 */
class GarminConnectState(private val container: AppContainer) {
    var status by mutableStateOf<StravaStatusResponse?>(null)
        private set
    var isLoading by mutableStateOf(true)
        private set
    var isConnecting by mutableStateOf(false)
        private set
    var isSyncing by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
    var syncMessage by mutableStateOf<String?>(null)

    suspend fun refresh() {
        isLoading = true
        status = runCatching { container.integrationsApi.garminStatus() }.getOrNull()
        isLoading = false
    }

    suspend fun connect(username: String, password: String) {
        errorMessage = null
        isConnecting = true
        try {
            // integrationsApi is called directly (no repository layer for integrations), so apiCall() must be invoked explicitly here to get HttpException translated into ApiException — otherwise a 401 would surface as a raw retrofit2.HttpException instead of Unauthorized.
            apiCall { container.integrationsApi.connectGarmin(GarminConnectRequest(username, password)) }
            refresh()
        } catch (e: ApiException.Unauthorized) {
            // apiCall() maps every 401 to Unauthorized before the response body (garmin_invalid_credentials) can be read — the same situation AuthScreen.kt's friendlyCredentialsMessage works around for a wrong login password.
            errorMessage = container.context.getString(R.string.garmin_error_invalid_credentials)
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.garmin_error_connect_failed, e.message)
        } finally {
            isConnecting = false
        }
    }

    suspend fun disconnect() {
        errorMessage = null
        try {
            container.integrationsApi.disconnectGarmin()
            refresh()
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.garmin_error_disconnect_failed, e.message)
        }
    }

    suspend fun sync() {
        errorMessage = null
        syncMessage = null
        isSyncing = true
        try {
            val result = container.integrationsApi.syncGarmin()
            syncMessage = container.context.resources.getQuantityString(
                R.plurals.plural_activities_imported,
                result.activitiesIngested,
                result.activitiesIngested,
            )
        } catch (e: Exception) {
            errorMessage = container.context.getString(R.string.garmin_error_sync_failed, e.message)
        } finally {
            isSyncing = false
        }
    }
}

/** Garmin row — direct-credentials connect form when not connected (no OAuth redirect exists for Garmin), otherwise the same status/actions layout as Strava/Health Connect. */
@Composable
fun GarminConnectSection(container: AppContainer) {
    val state = remember { GarminConnectState(container) }
    val scope = rememberCoroutineScope()
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { state.refresh() }

    Column {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Garmin", style = MaterialTheme.typography.titleMedium)
                val status = state.status
                val connectedSinceSuffix = status?.connectedAt?.let {
                    stringResource(R.string.garmin_connected_since_suffix, formatFullDate(it))
                } ?: ""
                val statusText = when {
                    state.isLoading -> stringResource(R.string.garmin_status_loading)
                    status?.connected == true -> stringResource(R.string.garmin_status_connected) + connectedSinceSuffix
                    else -> stringResource(R.string.garmin_status_not_connected)
                }
                Text(statusText, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (state.status?.connected == true) {
                TextButton(onClick = { scope.launch { state.sync() } }, enabled = !state.isSyncing) {
                    Text(if (state.isSyncing) "…" else stringResource(R.string.garmin_action_resync))
                }
                TextButton(onClick = { scope.launch { state.disconnect() } }) { Text(stringResource(R.string.garmin_action_disconnect)) }
            }
        }

        if (state.status?.connected != true) {
            Spacer(Modifier.height(8.dp))
            Text(
                stringResource(R.string.garmin_unofficial_warning),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = username,
                onValueChange = { username = it },
                label = { Text(stringResource(R.string.garmin_field_username)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text(stringResource(R.string.garmin_field_password)) },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
            Button(
                onClick = {
                    scope.launch {
                        state.connect(username, password)
                        if (state.errorMessage == null) password = ""
                    }
                },
                enabled = username.isNotBlank() && password.isNotBlank() && !state.isConnecting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (state.isConnecting) "…" else stringResource(R.string.garmin_action_connect))
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
