import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/client';
import { devLogin } from '../helpers/auth';
import { resetDb } from '../helpers/db';

const app = createApp();

afterEach(resetDb);
afterAll(async () => prisma.$disconnect());

describe('GET /me/calendar-token', () => {
  it('creates a token on first call and returns the same one afterwards', async () => {
    const { token } = await devLogin(app);
    const first = await request(app).get('/api/v1/me/calendar-token').set('Authorization', `Bearer ${token}`);
    expect(first.status).toBe(200);
    expect(first.body.token).toBeTruthy();
    expect(first.body.url).toContain(first.body.token);

    const second = await request(app).get('/api/v1/me/calendar-token').set('Authorization', `Bearer ${token}`);
    expect(second.body.token).toBe(first.body.token);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/me/calendar-token');
    expect(res.status).toBe(401);
  });
});

describe('POST /me/calendar-token/rotate', () => {
  it('issues a new token, invalidating the old one', async () => {
    const { token } = await devLogin(app);
    const first = await request(app).get('/api/v1/me/calendar-token').set('Authorization', `Bearer ${token}`);
    const rotated = await request(app).post('/api/v1/me/calendar-token/rotate').set('Authorization', `Bearer ${token}`);

    expect(rotated.body.token).not.toBe(first.body.token);

    const oldFeed = await request(app).get('/api/v1/me/calendar.ics').query({ token: first.body.token });
    expect(oldFeed.status).toBe(404);

    const newFeed = await request(app).get('/api/v1/me/calendar.ics').query({ token: rotated.body.token });
    expect(newFeed.status).toBe(200);
  });
});

describe('GET /me/calendar.ics', () => {
  it('serves a valid empty calendar with just a token, no Authorization header', async () => {
    const { token } = await devLogin(app);
    const tokenRes = await request(app).get('/api/v1/me/calendar-token').set('Authorization', `Bearer ${token}`);

    const res = await request(app).get('/api/v1/me/calendar.ics').query({ token: tokenRes.body.token });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/calendar');
    expect(res.text).toContain('BEGIN:VCALENDAR');
    expect(res.text).toContain('END:VCALENDAR');
  });

  it('includes one all-day VEVENT per workout from the active plan', async () => {
    const { token } = await devLogin(app);
    await request(app).put('/api/v1/me/profile').set('Authorization', `Bearer ${token}`).send({ level: 'beginner' });
    await request(app)
      .put('/api/v1/me/availability')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionsPerWeek: 4, maxSessionDurationMin: 60, availableDays: [2, 4, 6, 7], preferredTimeSlots: [], mandatoryRestDays: [1] });
    const goal = await request(app)
      .post('/api/v1/me/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'run10k', targetDate: '2027-01-01T00:00:00Z', priority: 'a' });
    await request(app).post('/api/v1/plans/generate').set('Authorization', `Bearer ${token}`).send({ goalId: goal.body.id, durationWeeks: 8 });

    const tokenRes = await request(app).get('/api/v1/me/calendar-token').set('Authorization', `Bearer ${token}`);
    const res = await request(app).get('/api/v1/me/calendar.ics').query({ token: tokenRes.body.token });

    expect(res.status).toBe(200);
    expect(res.text).toContain('BEGIN:VEVENT');
    expect(res.text).toContain('DTSTART;VALUE=DATE:');
    expect(res.text).toContain('DTEND;VALUE=DATE:');
  });

  it('returns 404 for an unknown token', async () => {
    const res = await request(app).get('/api/v1/me/calendar.ics').query({ token: 'does-not-exist' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when no token is provided', async () => {
    const res = await request(app).get('/api/v1/me/calendar.ics');
    expect(res.status).toBe(400);
  });
});
