import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-control px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-brand/15 text-brand' : 'text-secondary-text'}`;

/** Shared shell for the authenticated, onboarded app — top nav + signed-in page content. */
export function AppLayout() {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // React Router swaps content in place with no full page load, so nothing
  // tells assistive tech a "new page" happened the way it would for a
  // traditional multi-page site (where the browser resets focus to <body>
  // itself). Moving focus to the main landmark on every route change is the
  // standard SPA fix — from there, a screen reader user reads forward
  // starting at that page's own heading rather than being silently left
  // wherever they'd clicked on the previous page.
  useEffect(() => {
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-2 border-b border-separator px-4 py-3">
        <span className="mr-2 font-bold text-brand">TriCoach AI</span>
        <nav className="flex flex-wrap gap-1">
          <NavLink to="/" end className={navLinkClass}>
            Tableau de bord
          </NavLink>
          <NavLink to="/calendar" className={navLinkClass}>
            Calendrier
          </NavLink>
          <NavLink to="/goals" className={navLinkClass}>
            Objectifs
          </NavLink>
          <NavLink to="/activities" className={navLinkClass}>
            Activités
          </NavLink>
          <NavLink to="/nutrition/menu" className={navLinkClass}>
            Menu
          </NavLink>
          <NavLink to="/nutrition/recipes" className={navLinkClass}>
            Recettes
          </NavLink>
          <NavLink to="/nutrition/groceries" className={navLinkClass}>
            Liste de courses
          </NavLink>
          <NavLink to="/adaptation-history" className={navLinkClass}>
            Historique
          </NavLink>
          <NavLink to="/analytics" className={navLinkClass}>
            Analytique
          </NavLink>
          <NavLink to="/profile" className={navLinkClass}>
            Profil
          </NavLink>
        </nav>
        <button type="button" onClick={signOut} className="ml-auto text-sm font-medium text-secondary-text">
          Déconnexion
        </button>
      </header>
      <main ref={mainRef} tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
    </div>
  );
}
