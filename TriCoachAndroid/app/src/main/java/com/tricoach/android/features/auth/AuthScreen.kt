package com.tricoach.android.features.auth

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.tricoach.android.app.AppContainer
import com.tricoach.android.core.network.ApiException
import com.tricoach.android.models.User
import kotlinx.coroutines.launch

private enum class CredentialsMode { LOGIN, REGISTER }

/** Mirrors iOS's AuthView/AuthViewModel: one screen, a Login/Register toggle, no Apple/Google sign-in (see plan — email/password only for Android). */
@Composable
fun AuthScreen(container: AppContainer, onSignedIn: (User) -> Unit) {
    var mode by remember { mutableStateOf(CredentialsMode.LOGIN) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val isEmailValid = email.contains("@") && email.substringAfter("@").contains(".")
    val isPasswordValid = if (mode == CredentialsMode.REGISTER) password.length >= 8 else password.isNotEmpty()
    val canSubmit = isEmailValid && isPasswordValid && !isLoading

    fun submit() {
        errorMessage = null
        isLoading = true
        scope.launch {
            try {
                val user = if (mode == CredentialsMode.REGISTER) {
                    container.authRepository.register(email, password, fullName.ifBlank { null })
                } else {
                    container.authRepository.login(email, password)
                }
                onSignedIn(user)
            } catch (e: ApiException.Server) {
                errorMessage = friendlyCredentialsMessage(e.code)
            } catch (e: ApiException.Unauthorized) {
                // /auth/login returns a plain 401 for a wrong password (no body to parse) — map it the same as an explicit invalid_credentials code.
                errorMessage = friendlyCredentialsMessage("invalid_credentials")
            } catch (e: ApiException.Network) {
                errorMessage = "Impossible de contacter le serveur. Vérifiez votre connexion."
            } finally {
                isLoading = false
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
        Text("TriCoach AI", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(24.dp))

        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
            SegmentedButton(
                selected = mode == CredentialsMode.LOGIN,
                onClick = { mode = CredentialsMode.LOGIN },
                shape = SegmentedButtonDefaults.itemShape(0, 2),
            ) { Text("Connexion") }
            SegmentedButton(
                selected = mode == CredentialsMode.REGISTER,
                onClick = { mode = CredentialsMode.REGISTER },
                shape = SegmentedButtonDefaults.itemShape(1, 2),
            ) { Text("Inscription") }
        }
        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))

        if (mode == CredentialsMode.REGISTER) {
            OutlinedTextField(
                value = fullName,
                onValueChange = { fullName = it },
                label = { Text("Nom complet (optionnel)") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
        }

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Mot de passe") },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            supportingText = if (mode == CredentialsMode.REGISTER) { { Text("8 caractères minimum") } } else null,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(16.dp))

        if (errorMessage != null) {
            Text(errorMessage!!, color = MaterialTheme.colorScheme.error)
            Spacer(Modifier.height(8.dp))
        }

        if (isLoading) {
            CircularProgressIndicator()
        } else {
            Button(onClick = ::submit, enabled = canSubmit, modifier = Modifier.fillMaxWidth()) {
                Text(if (mode == CredentialsMode.REGISTER) "Créer mon compte" else "Se connecter")
            }
        }
    }
}

/** Mirrors iOS's friendlyCredentialsMessage(for:) exactly, including the backend error codes it maps. */
private fun friendlyCredentialsMessage(code: String?): String = when (code) {
    "email_taken" -> "Un compte existe déjà avec cette adresse email."
    "invalid_credentials" -> "Email ou mot de passe incorrect."
    "invalid_request" -> "Vérifiez les informations saisies."
    else -> "Une erreur est survenue. Réessayez."
}
