package com.tricoach.android.app

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.tricoach.android.R
import com.tricoach.android.features.activityhistory.ActivityHistoryScreen
import com.tricoach.android.features.adaptation.AdaptationHistoryScreen
import com.tricoach.android.features.analytics.DashboardAnalyticsScreen
import com.tricoach.android.features.calendar.CalendarScreen
import com.tricoach.android.features.dashboard.DashboardScreen
import com.tricoach.android.features.goals.GoalsScreen
import com.tricoach.android.features.profile.ProfileScreen
import com.tricoach.android.features.workoutdetail.WorkoutDetailScreen
import com.tricoach.android.models.Workout

private const val ROUTE_DASHBOARD = "dashboard"
private const val ROUTE_CALENDAR = "calendar"
private const val ROUTE_PROFILE = "profile"
private const val ROUTE_WORKOUT_DETAIL = "workout_detail"
private const val ROUTE_GOALS = "goals"
private const val ROUTE_ADAPTATION_HISTORY = "adaptation_history"
private const val ROUTE_DASHBOARD_ANALYTICS = "dashboard_analytics"
private const val ROUTE_ACTIVITY_HISTORY = "activity_history"

/**
 * Three-tab shell (Dashboard/Calendar/Profile) + a pushed Workout Detail
 * destination — mirrors iOS's MainTabView, minus the Nutrition tab (out of
 * scope for Android Phase 1). The selected workout is passed via a small
 * shared holder rather than a nav argument: iOS never re-fetches a workout
 * by id either (no such endpoint exists), it's always handed the object the
 * user just tapped.
 */
@Composable
fun MainScaffold(container: AppContainer, appState: AppState) {
    val navController = rememberNavController()
    var selectedWorkout by remember { mutableStateOf<Workout?>(null) }

    fun openWorkout(workout: Workout) {
        selectedWorkout = workout
        navController.navigate(ROUTE_WORKOUT_DETAIL)
    }

    Scaffold(
        bottomBar = {
            val backStackEntry by navController.currentBackStackEntryAsState()
            val currentRoute = backStackEntry?.destination
            NavigationBar {
                NavigationBarItem(
                    selected = currentRoute?.hierarchy?.any { it.route == ROUTE_DASHBOARD } == true,
                    onClick = { navController.navigate(ROUTE_DASHBOARD) { popUpTo(navController.graph.findStartDestination().id) { saveState = true }; launchSingleTop = true; restoreState = true } },
                    icon = { Text("⏱") },
                    label = { Text(stringResource(R.string.nav_dashboard)) },
                )
                NavigationBarItem(
                    selected = currentRoute?.hierarchy?.any { it.route == ROUTE_CALENDAR } == true,
                    onClick = { navController.navigate(ROUTE_CALENDAR) { popUpTo(navController.graph.findStartDestination().id) { saveState = true }; launchSingleTop = true; restoreState = true } },
                    icon = { Text("📅") },
                    label = { Text(stringResource(R.string.nav_calendar)) },
                )
                NavigationBarItem(
                    selected = currentRoute?.hierarchy?.any { it.route == ROUTE_PROFILE } == true,
                    onClick = { navController.navigate(ROUTE_PROFILE) { popUpTo(navController.graph.findStartDestination().id) { saveState = true }; launchSingleTop = true; restoreState = true } },
                    icon = { Text("👤") },
                    label = { Text(stringResource(R.string.nav_profile)) },
                )
            }
        },
    ) { padding ->
        NavHost(navController, startDestination = ROUTE_DASHBOARD, modifier = Modifier.padding(padding)) {
            composable(ROUTE_DASHBOARD) {
                DashboardScreen(
                    container,
                    onWorkoutClick = ::openWorkout,
                    onViewAdaptationHistory = { navController.navigate(ROUTE_ADAPTATION_HISTORY) },
                    onViewAnalytics = { navController.navigate(ROUTE_DASHBOARD_ANALYTICS) },
                )
            }
            composable(ROUTE_CALENDAR) { CalendarScreen(container, onWorkoutClick = ::openWorkout) }
            composable(ROUTE_PROFILE) {
                ProfileScreen(
                    container = container,
                    user = appState.currentUser,
                    onUserUpdated = { appState.setCurrentUser(it) },
                    onSignOut = { appState.signOut() },
                    onNavigateToGoals = { navController.navigate(ROUTE_GOALS) },
                    onNavigateToActivityHistory = { navController.navigate(ROUTE_ACTIVITY_HISTORY) },
                )
            }
            composable(ROUTE_GOALS) { GoalsScreen(container) }
            composable(ROUTE_ADAPTATION_HISTORY) { AdaptationHistoryScreen(container) }
            composable(ROUTE_DASHBOARD_ANALYTICS) { DashboardAnalyticsScreen(container) }
            composable(ROUTE_ACTIVITY_HISTORY) { ActivityHistoryScreen(container) }
            composable(ROUTE_WORKOUT_DETAIL) {
                selectedWorkout?.let { workout ->
                    WorkoutDetailScreen(
                        container = container,
                        workout = workout,
                        onWorkoutUpdated = { selectedWorkout = it },
                        onBack = { navController.popBackStack() },
                    )
                }
            }
        }
    }
}
