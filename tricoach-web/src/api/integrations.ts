import { apiFetch } from './client';
import type { AdaptationEvent } from './types';

export interface ConnectionStatus {
  connected: boolean;
  connectedAt: string | null;
}

export interface SyncResult {
  activitiesIngested: number;
  adaptationEvents: AdaptationEvent[];
}

// ---- Strava (OAuth — browser is redirected to Strava, then back to /profile) ----

export function getStravaAuthUrl(): Promise<{ url: string }> {
  return apiFetch('/integrations/strava/auth-url');
}

export function getStravaStatus(): Promise<ConnectionStatus> {
  return apiFetch('/integrations/strava/status');
}

export function disconnectStrava(): Promise<void> {
  return apiFetch('/integrations/strava', { method: 'DELETE' });
}

export function syncStrava(): Promise<SyncResult> {
  return apiFetch('/integrations/strava/sync', { method: 'POST' });
}

// ---- Garmin (no OAuth — the athlete's own Garmin username/password) ----

export function connectGarmin(username: string, password: string): Promise<{ connected: boolean }> {
  return apiFetch('/integrations/garmin/connect', { method: 'POST', body: { username, password } });
}

export function getGarminStatus(): Promise<ConnectionStatus> {
  return apiFetch('/integrations/garmin/status');
}

export function disconnectGarmin(): Promise<void> {
  return apiFetch('/integrations/garmin', { method: 'DELETE' });
}

export function syncGarmin(): Promise<SyncResult> {
  return apiFetch('/integrations/garmin/sync', { method: 'POST' });
}
