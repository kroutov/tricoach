import { apiFetch } from './client';

export interface User {
  id: string;
  appleUserId: string | null;
  email: string | null;
  fullName: string | null;
  createdAt: string;
  hasCompletedOnboarding: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export function register(email: string, password: string, fullName?: string): Promise<AuthResponse> {
  return apiFetch('/auth/register', { method: 'POST', body: { email, password, fullName } });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch('/auth/login', { method: 'POST', body: { email, password } });
}

export function refresh(): Promise<{ token: string }> {
  return apiFetch('/auth/refresh', { method: 'POST' });
}

export function getMe(): Promise<User> {
  return apiFetch('/me');
}
