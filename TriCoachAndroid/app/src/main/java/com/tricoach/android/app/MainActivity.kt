package com.tricoach.android.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import com.tricoach.android.features.auth.AuthScreen
import com.tricoach.android.features.onboarding.OnboardingFlowScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val container = AppContainer(applicationContext)
        setContent {
            MaterialTheme {
                Surface {
                    RootNavigation(container)
                }
            }
        }
    }
}

/** Mirrors iOS's RootView: switches the whole screen based on the derived auth/onboarding/main route, rather than nesting that switch inside a single nav graph. */
@Composable
private fun RootNavigation(container: AppContainer) {
    val appState = remember { AppState(container) }

    LaunchedEffect(Unit) { appState.load() }

    when (appState.route) {
        AppRoute.AUTH -> AuthScreen(container, onSignedIn = { appState.completeSignIn(it) })
        AppRoute.ONBOARDING -> OnboardingFlowScreen(container, onFinished = { appState.completeOnboarding() })
        AppRoute.MAIN -> MainScaffold(container, appState)
    }
}
