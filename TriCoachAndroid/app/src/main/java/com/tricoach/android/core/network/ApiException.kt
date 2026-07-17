package com.tricoach.android.core.network

/** Mirrors iOS's NetworkError: distinguishes an expired session from a backend-reported error code from a network/decoding failure, so screens can map each to a specific message. */
sealed class ApiException(message: String) : Exception(message) {
    object Unauthorized : ApiException("Session expirée, merci de vous reconnecter.")
    data class Server(val status: Int, val code: String?) : ApiException(code ?: "Erreur serveur ($status).")
    data class Network(override val cause: Throwable) : ApiException("Impossible de contacter le serveur. Vérifiez votre connexion.")
}
