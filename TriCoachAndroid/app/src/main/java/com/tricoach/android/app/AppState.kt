package com.tricoach.android.app

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.tricoach.android.core.network.UpdateUserRequest
import com.tricoach.android.core.network.apiCall
import com.tricoach.android.models.User

enum class AppRoute { AUTH, ONBOARDING, MAIN }

/**
 * Mirrors iOS's AppState: a single observable holder for "who's logged in"
 * and the derived auth/onboarding/main route, owned once at the app root
 * (not a per-screen ViewModel). Every mutation persists to the session
 * repository before publishing, so a process death never loses the write.
 */
class AppState(private val container: AppContainer) {
    var currentUser: User? by mutableStateOf(null)
        private set

    val route: AppRoute
        get() {
            val user = currentUser ?: return AppRoute.AUTH
            return if (user.hasCompletedOnboarding) AppRoute.MAIN else AppRoute.ONBOARDING
        }

    suspend fun load() {
        currentUser = container.userSessionRepository.currentUser()
    }

    fun completeSignIn(user: User) {
        currentUser = user
    }

    /** Reconciles the shared user record after a direct update made outside onboarding (e.g. saving the profile). */
    suspend fun setCurrentUser(user: User) {
        container.userSessionRepository.save(user)
        currentUser = user
    }

    suspend fun completeOnboarding() {
        val user = currentUser ?: return
        val updated = try {
            apiCall { container.userApiClient.updateUser(UpdateUserRequest(hasCompletedOnboarding = true)) }
        } catch (e: Exception) {
            // Backend unreachable: keep the local flag so onboarding doesn't loop;
            // the next successful sync reconciles the server record.
            user.copy(hasCompletedOnboarding = true)
        }
        container.userSessionRepository.save(updated)
        currentUser = updated
    }

    suspend fun signOut() {
        container.authRepository.signOut()
        currentUser = null
    }
}
