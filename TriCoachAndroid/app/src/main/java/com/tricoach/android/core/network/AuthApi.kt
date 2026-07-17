package com.tricoach.android.core.network

import com.tricoach.android.models.User
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.POST

@Serializable
data class AuthResponse(val token: String, val user: User)

@Serializable
data class RefreshResponse(val token: String)

@Serializable
data class RegisterRequest(val email: String, val password: String, val fullName: String? = null)

@Serializable
data class LoginRequest(val email: String, val password: String)

interface AuthApi {
    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): AuthResponse

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @POST("auth/refresh")
    suspend fun refresh(): RefreshResponse
}
