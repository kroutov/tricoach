package com.tricoach.android.features.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.tricoach.android.app.AppContainer
import com.tricoach.android.features.shared.CardBox
import com.tricoach.android.models.AthleteProfile
import com.tricoach.android.models.User
import com.tricoach.android.models.label
import kotlinx.coroutines.launch

/** Minimal read-only profile for Phase 1 — account info + athlete summary + sign out. Goals management, integrations, and location (all iOS features) are deferred to later phases, see plan. */
@Composable
fun ProfileScreen(
    container: AppContainer,
    user: User?,
    onUserUpdated: suspend (User) -> Unit,
    onSignOut: suspend () -> Unit,
) {
    var profile by remember { mutableStateOf(AthleteProfile.empty) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        profile = runCatching { container.profileRepository.fetch() }.getOrDefault(AthleteProfile.empty)
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Text("Profil", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(16.dp))

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            CardBox {
                Text("Compte", style = MaterialTheme.typography.titleMedium)
                LabeledRow("Nom", user?.fullName ?: "Athlète")
                user?.email?.let { LabeledRow("Email", it) }
            }

            CardBox {
                Text("Profil athlète", style = MaterialTheme.typography.titleMedium)
                LabeledRow("Niveau", profile.level.label)
                profile.hrMax?.let { LabeledRow("FC max", "$it bpm") }
                profile.hrRest?.let { LabeledRow("FC repos", "$it bpm") }
                profile.ftpWatts?.let { LabeledRow("FTP", "$it W") }
            }

            Button(
                onClick = { scope.launch { onSignOut() } },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Se déconnecter")
            }
        }
    }
}

@Composable
private fun LabeledRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value)
    }
}
