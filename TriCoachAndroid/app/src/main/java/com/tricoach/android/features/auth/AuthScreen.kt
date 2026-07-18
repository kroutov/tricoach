package com.tricoach.android.features.auth

import android.content.Context
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.tricoach.android.R
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
    val context = LocalContext.current

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
                errorMessage = friendlyCredentialsMessage(context, e.code)
            } catch (e: ApiException.Unauthorized) {
                // /auth/login returns a plain 401 for a wrong password (no body to parse) — map it the same as an explicit invalid_credentials code.
                errorMessage = friendlyCredentialsMessage(context, "invalid_credentials")
            } catch (e: ApiException.Network) {
                errorMessage = context.getString(R.string.auth_error_network)
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
            ) { Text(stringResource(R.string.auth_login)) }
            SegmentedButton(
                selected = mode == CredentialsMode.REGISTER,
                onClick = { mode = CredentialsMode.REGISTER },
                shape = SegmentedButtonDefaults.itemShape(1, 2),
            ) { Text(stringResource(R.string.auth_register)) }
        }
        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text(stringResource(R.string.auth_email)) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))

        if (mode == CredentialsMode.REGISTER) {
            OutlinedTextField(
                value = fullName,
                onValueChange = { fullName = it },
                label = { Text(stringResource(R.string.auth_full_name)) },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
        }

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text(stringResource(R.string.auth_password)) },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            supportingText = if (mode == CredentialsMode.REGISTER) { { Text(stringResource(R.string.auth_password_hint)) } } else null,
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
                Text(stringResource(if (mode == CredentialsMode.REGISTER) R.string.auth_create_account else R.string.auth_sign_in))
            }
        }
    }
}

/** Mirrors iOS's friendlyCredentialsMessage(for:) exactly, including the backend error codes it maps. Not @Composable — called from inside a coroutine (submit()'s scope.launch), so it takes an explicit Context rather than using stringResource(). */
private fun friendlyCredentialsMessage(context: Context, code: String?): String = when (code) {
    "email_taken" -> context.getString(R.string.auth_error_email_taken)
    "invalid_credentials" -> context.getString(R.string.auth_error_invalid_credentials)
    "invalid_request" -> context.getString(R.string.auth_error_invalid_request)
    else -> context.getString(R.string.auth_error_generic)
}
