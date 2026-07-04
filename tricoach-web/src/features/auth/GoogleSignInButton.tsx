import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../../api/auth';
import { useAuth } from './AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

// Google Identity Services attaches `google` to `window` once its script
// loads — no official types package for this, so a minimal ambient
// declaration for just what's used here instead of pulling in a dependency.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
          renderButton(parent: HTMLElement, options: { theme: string; size: string; width?: number }): void;
        };
      };
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google) return Promise.resolve();
  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }
  return scriptLoadPromise;
}

/**
 * Renders nothing if `VITE_GOOGLE_CLIENT_ID` isn't configured — Google
 * Sign-In requires a real OAuth Client ID from Google Cloud Console (see
 * tricoach-backend/docs/DEPLOYMENT.md), which isn't provisioned by default.
 */
export function GoogleSignInButton() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return;

    let cancelled = false;
    loadGoogleScript().then(() => {
      if (cancelled || !window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const result = await loginWithGoogle(response.credential);
            signIn(result.token, result.user);
            navigate('/');
          } catch {
            // Swallow — a failed Google sign-in leaves the user on the
            // login/register page, which already shows its own form.
          }
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, { theme: 'outline', size: 'large', width: 320 });
    });

    return () => {
      cancelled = true;
    };
  }, [signIn, navigate]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 h-px bg-separator" />
        <span className="text-sm text-secondary-text">ou</span>
        <div className="flex-1 h-px bg-separator" />
      </div>
      <div ref={containerRef} />
    </div>
  );
}
