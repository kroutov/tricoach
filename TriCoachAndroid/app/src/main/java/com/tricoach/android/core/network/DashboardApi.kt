package com.tricoach.android.core.network

import com.tricoach.android.models.DashboardAnalytics
import com.tricoach.android.models.DashboardSummary
import retrofit2.http.GET

interface DashboardApi {
    @GET("dashboard/summary")
    suspend fun fetchSummary(): DashboardSummary

    @GET("dashboard/analytics")
    suspend fun fetchAnalytics(): DashboardAnalytics
}
