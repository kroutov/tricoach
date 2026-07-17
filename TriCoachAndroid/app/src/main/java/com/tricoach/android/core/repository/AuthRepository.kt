package com.tricoach.android.core.repository

import com.tricoach.android.core.auth.TokenStore
import com.tricoach.android.core.network.AuthApi
import com.tricoach.android.core.network.LoginRequest
import com.tricoach.android.core.network.RegisterRequest
import com.tricoach.android.core.network.apiCall
import com.tricoach.android.models.User

/** Register/login always persist the token + user session together — mirrors AuthViewModel.signInWithCredentials's tokenStore.save + userSessionRepository.save pairing. */
class AuthRepository(
    private val api: AuthApi,
    private val tokenStore: TokenStore,
    private val userSessionRepository: UserSessionRepository,
) {
    suspend fun register(email: String, password: String, fullName: String?): User {
        val response = apiCall { api.register(RegisterRequest(email, password, fullName)) }
        tokenStore.token = response.token
        userSessionRepository.save(response.user)
        return response.user
    }

    suspend fun login(email: String, password: String): User {
        val response = apiCall { api.login(LoginRequest(email, password)) }
        tokenStore.token = response.token
        userSessionRepository.save(response.user)
        return response.user
    }

    suspend fun signOut() {
        tokenStore.clear()
        userSessionRepository.clear()
    }
}
