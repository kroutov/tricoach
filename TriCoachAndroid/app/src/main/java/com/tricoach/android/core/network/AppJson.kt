package com.tricoach.android.core.network

import kotlinx.serialization.json.Json

/** Shared serializer — used for both API payloads and the Room cache's JSON envelope columns, so a domain object round-trips identically through either path. */
val AppJson = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
}
