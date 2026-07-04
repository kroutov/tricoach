import { Express } from 'express';
import request from 'supertest';

export async function devLogin(app: Express, overrides: Partial<{ appleUserId: string; email: string; fullName: string }> = {}) {
  const res = await request(app)
    .post('/api/v1/auth/dev-login')
    .send({
      appleUserId: overrides.appleUserId ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      email: overrides.email,
      fullName: overrides.fullName ?? 'Test Athlete',
    });
  return { token: res.body.token as string, user: res.body.user };
}
