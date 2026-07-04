import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../src/app';
import { config } from '../../src/config';
import { prisma } from '../../src/db/client';
import { devLogin } from '../helpers/auth';
import { resetDb } from '../helpers/db';

const app = createApp();

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
afterEach(resetDb);
afterAll(async () => prisma.$disconnect());

function mockFetchSequence(responses: unknown[]) {
  const mock = jest.fn();
  for (const body of responses) {
    mock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
  }
  global.fetch = mock as unknown as typeof fetch;
}

describe('GET /webhooks/strava (subscription validation)', () => {
  it('echoes the challenge when the verify token matches', async () => {
    const res = await request(app)
      .get('/api/v1/webhooks/strava')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': config.strava.webhookVerifyToken, 'hub.challenge': 'xyz123' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ 'hub.challenge': 'xyz123' });
  });

  it('rejects a mismatched verify token', async () => {
    const res = await request(app)
      .get('/api/v1/webhooks/strava')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': 'xyz123' });
    expect(res.status).toBe(403);
  });
});

describe('POST /webhooks/strava (event receipt)', () => {
  it('routes an activity event to the connected user and ingests it', async () => {
    const { user } = await devLogin(app);
    const state = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '10m' });
    mockFetchSequence([{ access_token: 'a', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, athlete: { id: 777 } }]);
    await request(app).get('/api/v1/integrations/strava/callback').query({ code: 'abc', state });

    mockFetchSequence([{ id: 42, type: 'Ride', start_date: new Date().toISOString(), elapsed_time: 2400, distance: 15000 }]);

    const res = await request(app)
      .post('/api/v1/webhooks/strava')
      .send({ object_type: 'activity', aspect_type: 'create', object_id: 42, owner_id: 777 });
    expect(res.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 300)); // let the fire-and-forget processing settle
    const stored = await prisma.completedActivity.findFirst({ where: { externalId: '42' } });
    expect(stored).not.toBeNull();
    expect(stored?.source).toBe('STRAVA');
  });

  it('acks unknown athletes without error', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks/strava')
      .send({ object_type: 'activity', aspect_type: 'create', object_id: 1, owner_id: 999999 });
    expect(res.status).toBe(200);
  });
});
