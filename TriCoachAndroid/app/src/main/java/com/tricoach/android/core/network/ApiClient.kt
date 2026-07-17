package com.tricoach.android.core.network

import com.tricoach.android.BuildConfig
import com.tricoach.android.core.auth.TokenStore
import kotlinx.serialization.Serializable
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.HttpException
import retrofit2.Retrofit
import java.io.IOException

@Serializable
private data class ApiErrorBody(val error: String? = null)

/** Attaches the current JWT (if any) to every request — mirrors APIClient.swift's per-request bearer token injection. */
private class AuthInterceptor(private val tokenStore: TokenStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder().apply {
            tokenStore.token?.let { addHeader("Authorization", "Bearer $it") }
        }.build()
        return chain.proceed(request)
    }
}

class ApiClient(tokenStore: TokenStore) {
    val retrofit: Retrofit = run {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
        }
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(tokenStore))
            .addInterceptor(loggingInterceptor)
            .build()

        Retrofit.Builder()
            .baseUrl(ApiConfig.baseUrl)
            .client(okHttpClient)
            .addConverterFactory(AppJson.asConverterFactory("application/json".toMediaType()))
            .build()
    }
}

/**
 * Wraps a Retrofit suspend call, translating transport/HTTP failures into
 * [ApiException] the same way APIClient.swift's performRaw does: 401 →
 * Unauthorized, other non-2xx → Server(status, backend error code), anything
 * that never reached the server → Network.
 */
suspend fun <T> apiCall(block: suspend () -> T): T {
    return try {
        block()
    } catch (e: HttpException) {
        if (e.code() == 401) {
            throw ApiException.Unauthorized
        }
        val code = e.response()?.errorBody()?.string()?.let {
            runCatching { AppJson.decodeFromString<ApiErrorBody>(it).error }.getOrNull()
        }
        throw ApiException.Server(e.code(), code)
    } catch (e: IOException) {
        throw ApiException.Network(e)
    }
}
