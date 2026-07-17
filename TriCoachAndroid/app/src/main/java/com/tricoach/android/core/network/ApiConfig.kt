package com.tricoach.android.core.network

import com.tricoach.android.BuildConfig

/** Debug builds target the local dev backend via the emulator's host-loopback alias (10.0.2.2 = the host machine's localhost) — the Android analog of iOS's simulator-vs-device APIConfig branch. */
object ApiConfig {
    val baseUrl: String =
        if (BuildConfig.DEBUG) "http://10.0.2.2:3000/api/v1/" else "https://tricoach-9ob8.onrender.com/api/v1/"
}
