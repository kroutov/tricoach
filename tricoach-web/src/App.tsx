import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { RequireAuth } from './features/auth/RequireAuth';
import { RequireOnboarding } from './features/auth/RequireOnboarding';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { WorkoutDetailPage } from './features/workoutDetail/WorkoutDetailPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { GoalsPage } from './features/goals/GoalsPage';
import { AdaptationHistoryPage } from './features/adaptationHistory/AdaptationHistoryPage';
import { ActivityHistoryPage } from './features/activityHistory/ActivityHistoryPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { RecipeCatalogPage } from './features/nutrition/RecipeCatalogPage';
import { WeeklyMenuPage } from './features/nutrition/WeeklyMenuPage';
import { GroceryListPage } from './features/nutrition/GroceryListPage';
import { AppLayout } from './components/AppLayout';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<OnboardingFlow />} />
          <Route element={<RequireOnboarding />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/workouts/:id" element={<WorkoutDetailPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/adaptation-history" element={<AdaptationHistoryPage />} />
              <Route path="/activities" element={<ActivityHistoryPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/nutrition/recipes" element={<RecipeCatalogPage />} />
              <Route path="/nutrition/menu" element={<WeeklyMenuPage />} />
              <Route path="/nutrition/groceries" element={<GroceryListPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
