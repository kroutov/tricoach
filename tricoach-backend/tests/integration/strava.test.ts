import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../src/app';
import { config } from '../../src/config';
import { prisma } from '../../src/db/client';
import { decryptToken } from '../../src/lib/crypto';
import { devLogin } from '../helpers/auth';
import { resetDb } from '../helpers/db';

const app = createApp();

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
afterEach(resetDb);
afterAll(async () => prisma.$disconnect());

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as typeof fetch;
}

describe('GET /integrations/strava/auth-url', () => {
  it('returns a well-formed Strava authorize URL carrying a signed state', async () => {
    const { token } = await devLogin(app);
    const res = await request(app).get('/api/v1/integrations/strava/auth-url').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const url = new URL(res.body.url);
    expect(url.origin + url.pathname).toBe('https://www.strava.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe(config.strava.clientId);
    expect(url.searchParams.get('redirect_uri')).toBe(config.strava.redirectUri);

    const decoded = jwt.verify(url.searchParams.get('state')!, config.jwtSecret) as { userId: string };
    expect(decoded.userId).toBeTruthy();
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/integrations/strava/auth-url');
    expect(res.status).toBe(401);
  });
});

describe('GET /integrations/strava/callback', () => {
  it('exchanges the code, stores encrypted tokens, and redirects into the app on success', async () => {
    const { token, user } = await devLogin(app);
    const state = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '10m' });
    mockFetchOnce({ access_token: 'access-123', refresh_token: 'refresh-456', expires_at: Math.floor(Date.now() / 1000) + 3600, athlete: { id: 999 } });

    const res = await request(app).get('/api/v1/integrations/strava/callback').query({ code: 'abc', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${config.webPublicUrl}/profile?strava=success`);

    const connection = await prisma.deviceConnection.findUnique({ where: { userId_provider: { userId: user.id, provider: 'STRAVA' } } });
    expect(connection).not.toBeNull();
    expect(connection?.providerUserId).toBe('999');
    expect(decryptToken(connection!.accessTokenEncrypted!)).toBe('access-123');
    expect(decryptToken(connection!.refreshTokenEncrypted!)).toBe('refresh-456');

    const statusRes = await request(app).get('/api/v1/integrations/strava/status').set('Authorization', `Bearer ${token}`);
    expect(statusRes.body.connected).toBe(true);
  });

  it('redirects with an error for a tampered state', async () => {
    const res = await request(app).get('/api/v1/integrations/strava/callback').query({ code: 'abc', state: 'not-a-valid-jwt' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('strava=error');
  });
});

describe('DELETE /integrations/strava', () => {
  it('removes the stored connection', async () => {
    const { token, user } = await devLogin(app);
    const state = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '10m' });
    mockFetchOnce({ access_token: 'a', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, athlete: { id: 1 } });
    await request(app).get('/api/v1/integrations/strava/callback').query({ code: 'abc', state });

    const del = await request(app).delete('/api/v1/integrations/strava').set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const connection = await prisma.deviceConnection.findFirst({ where: { userId: user.id, provider: 'STRAVA' } });
    expect(connection).toBeNull();
  });
});

describe('POST /integrations/strava/sync', () => {
  it('returns 409 when Strava is not connected', async () => {
    const { token } = await devLogin(app);
    const res = await request(app).post('/api/v1/integrations/strava/sync').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  it('pulls recent activities and ingests them once connected', async () => {
    const { token, user } = await devLogin(app);
    const state = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '10m' });
    mockFetchOnce({ access_token: 'a', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, athlete: { id: 42 } });
    await request(app).get('/api/v1/integrations/strava/callback').query({ code: 'abc', state });

    mockFetchOnce([
      { id: 555, type: 'Run', start_date: new Date().toISOString(), elapsed_time: 1800, distance: 5000 },
    ]);

    const res = await request(app).post('/api/v1/integrations/strava/sync').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.activitiesIngested).toBe(1);

    const stored = await prisma.completedActivity.findFirst({ where: { externalId: '555' } });
    expect(stored?.source).toBe('STRAVA');
  });
});
