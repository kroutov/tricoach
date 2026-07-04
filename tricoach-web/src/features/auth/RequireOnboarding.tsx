import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** Redirects to /onboarding until the athlete has completed it — mirrors AppState.route in the iOS app. */
export function RequireOnboarding() {
  const { user } = useAuth();

  if (user && !user.hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
