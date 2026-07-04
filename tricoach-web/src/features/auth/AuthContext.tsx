import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getStoredToken, setStoredToken } from '../../api/client';
import { getMe, type User } from '../../api/auth';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /** True while rehydrating the user from a token already in localStorage on first load. */
  isLoading: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  /** Updates the in-memory user after a `PUT /me` (e.g. onboarding completion) without touching the token. */
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(token !== null);

  // A token can survive a page reload (localStorage) even though the `user`
  // object only ever lived in memory — refetch it once on mount so route
  // guards don't have to treat "token but no user yet" as logged out.
  useEffect(() => {
    if (!token) return;
    getMe()
      .then(setUser)
      .catch(() => {
        setStoredToken(null);
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const signIn = (newToken: string, newUser: User) => {
    setStoredToken(newToken);
    setToken(newToken);
    setUser(newUser);
    setIsLoading(false);
  };

  const signOut = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: token !== null, isLoading, signIn, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
