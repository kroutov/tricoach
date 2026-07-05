import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/client';
import { devLogin } from '../helpers/auth';
import { resetDb } from '../helpers/db';

const app = createApp();

afterEach(resetDb);
afterAll(async () => prisma.$disconnect());

describe('athlete profile', () => {
  it('round-trips profile fields including sport-specific paces', async () => {
    const { token } = await devLogin(app);
    const put = await request(app)
      .put('/api/v1/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ level: 'advanced', hrMax: 190, hrRest: 48, thresholdPaceSecPerKm: 260, cssPaceSecPer100m: 90 });
    expect(put.status).toBe(200);
    expect(put.body.level).toBe('advanced');
    expect(put.body.thresholdPaceSecPerKm).toBe(260);

    const get = await request(app).get('/api/v1/me/profile').set('Authorization', `Bearer ${token}`);
    expect(get.body.cssPaceSecPer100m).toBe(90);
  });
});

describe('availability', () => {
  it('stores weekday arrays as-is', async () => {
    const { token } = await devLogin(app);
    const res = await request(app)
      .put('/api/v1/me/availability')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionsPerWeek: 5, maxSessionDurationMin: 75, availableDays: [2, 3, 4, 5, 6], preferredTimeSlots: ['evening'], mandatoryRestDays: [1] });
    expect(res.status).toBe(200);
    expect(res.body.availableDays).toEqual([2, 3, 4, 5, 6]);
  });
});

describe('goals', () => {
  it('creates, lists, updates and deletes a goal scoped to the caller', async () => {
    const { token } = await devLogin(app);
    const create = await request(app)
      .post('/api/v1/me/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'marathon', targetDate: '2027-04-01T00:00:00Z', priority: 'a', targetTimeSeconds: 12600 });
    expect(create.status).toBe(201);
    const goalId = create.body.id;

    const list = await request(app).get('/api/v1/me/goals').set('Authorization', `Bearer ${token}`);
    expect(list.body).toHaveLength(1);

    const update = await request(app)
      .put(`/api/v1/me/goals/${goalId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'marathon', targetDate: '2027-04-01T00:00:00Z', priority: 'b', targetTimeSeconds: 12000 });
    expect(update.body.priority).toBe('b');

    const del = await request(app).delete(`/api/v1/me/goals/${goalId}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
  });

  it('does not let one user see or modify another user\'s goal', async () => {
    const alice = await devLogin(app, { appleUserId: 'alice' });
    const bob = await devLogin(app, { appleUserId: 'bob' });

    const created = await request(app)
      .post('/api/v1/me/goals')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ type: 'run10k', targetDate: '2027-01-01T00:00:00Z', priority: 'a' });

    const bobDelete = await request(app).delete(`/api/v1/me/goals/${created.body.id}`).set('Authorization', `Bearer ${bob.token}`);
    expect(bobDelete.status).toBe(404);
  });
});

describe('constraints', () => {
  it('records a check-in and returns it in the recent window', async () => {
    const { token } = await devLogin(app);
    const post = await request(app)
      .post('/api/v1/me/constraints')
      .set('Authorization', `Bearer ${token}`)
      .send({ injuries: ['genou'], fatigueLevel: 4, stressLevel: 3, sleepHours: 5.5 });
    expect(post.status).toBe(201);

    const get = await request(app).get('/api/v1/me/constraints?days=7').set('Authorization', `Bearer ${token}`);
    expect(get.body).toHaveLength(1);
    expect(get.body[0].injuries).toEqual(['genou']);
  });
});

describe('activity history', () => {
  it('returns an empty list before anything is synced', async () => {
    const { token } = await devLogin(app);
    const res = await request(app).get('/api/v1/me/activities').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('lists completed activities most-recent-first with sport and source', async () => {
    const { token, user } = await devLogin(app);
    await prisma.completedActivity.create({
      data: { userId: user.id, source: 'STRAVA', sport: 'RUN', startTime: new Date('2026-07-01T08:00:00Z'), durationS: 1800 },
    });
    await prisma.completedActivity.create({
      data: { userId: user.id, source: 'STRAVA', sport: 'BIKE', startTime: new Date('2026-07-03T08:00:00Z'), durationS: 3600 },
    });

    const res = await request(app).get('/api/v1/me/activities').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].sport).toBe('bike');
    expect(res.body[0].source).toBe('strava');
    expect(res.body[1].sport).toBe('run');
  });
});
