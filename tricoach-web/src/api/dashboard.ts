import { apiFetch } from './client';
import type { DashboardAnalytics, DashboardSummary } from './types';

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch('/dashboard/summary');
}

export function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  return apiFetch('/dashboard/analytics');
}
