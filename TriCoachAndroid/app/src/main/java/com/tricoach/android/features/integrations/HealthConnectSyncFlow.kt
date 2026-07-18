package com.tricoach.android.features.integrations

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.platform.LocalContext
import com.tricoach.android.app.AppContainer
import com.tricoach.android.core.healthconnect.HealthConnectAvailability
import com.tricoach.android.core.healthconnect.HealthConnectManager
import kotlinx.coroutines.launch

/** Plain state holder (not a ViewModel) — mirrors StravaConnectState's shape, but there's no external round-trip to wait for: permission grant/denial comes back synchronously via the ActivityResultLauncher callback. */
class HealthConnectState(private val container: AppContainer) {
    var availability by mutableStateOf(HealthConnectAvailability.UNSUPPORTED)
        private set
    var hasPermissions by mutableStateOf(false)
        private set
    var isSyncing by mutableStateOf(false)
        private set
    var lastSyncCount by mutableStateOf<Int?>(null)
    var errorMessage by mutableStateOf<String?>(null)

    suspend fun refresh() {
        availability = container.healthConnectManager.availability()
        hasPermissions = container.healthConnectManager.hasAllPermissions()
    }

    suspend fun sync() {
        errorMessage = null
        isSyncing = true
        try {
            val payload = container.healthConnectManager.buildSyncRequest()
            val result = container.integrationsApi.syncHealthMetrics(payload)
            lastSyncCount = result.activitiesIngested
        } catch (e: Exception) {
            errorMessage = "Impossible de synchroniser Health Connect : ${e.message}"
        } finally {
            isSyncing = false
        }
    }
}

/** Health Connect row — mirrors iOS's HealthKitSyncSection, embedded in ProfileScreen's "Intégrations" card next to Strava (see plan §3b). */
@Composable
fun HealthConnectSection(container: AppContainer) {
    val state = remember { HealthConnectState(container) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    LaunchedEffect(Unit) { state.refresh() }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = remember { container.healthConnectManager.permissionRequestContract() },
    ) { granted ->
        scope.launch {
            state.refresh()
            if (granted.containsAll(HealthConnectManager.PERMISSIONS)) {
                state.sync()
            }
        }
    }

    Column {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Health Connect", style = MaterialTheme.typography.titleMedium)
                val statusText = when {
                    state.availability == HealthConnectAvailability.NOT_INSTALLED -> "Application non installée"
                    state.availability == HealthConnectAvailability.UNSUPPORTED -> "Non disponible sur cet appareil"
                    state.hasPermissions -> "Connecté"
                    else -> "Non connecté"
                }
                Text(statusText, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            when {
                state.availability == HealthConnectAvailability.NOT_INSTALLED -> {
                    Button(onClick = {
                        val uri = Uri.parse("market://details?id=com.google.android.apps.healthdata")
                        context.startActivity(Intent(Intent.ACTION_VIEW, uri).apply { setPackage("com.android.vending") })
                    }) { Text("Installer") }
                }
                state.availability == HealthConnectAvailability.AVAILABLE && state.hasPermissions -> {
                    TextButton(onClick = { scope.launch { state.sync() } }, enabled = !state.isSyncing) {
                        Text(if (state.isSyncing) "…" else "Resynchroniser")
                    }
                }
                state.availability == HealthConnectAvailability.AVAILABLE -> {
                    Button(onClick = { permissionLauncher.launch(HealthConnectManager.PERMISSIONS) }) {
                        Text("Connecter")
                    }
                }
            }
        }
        state.lastSyncCount?.let {
            Text("$it activité(s) importée(s).", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
        }
        state.errorMessage?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }
    }
}
