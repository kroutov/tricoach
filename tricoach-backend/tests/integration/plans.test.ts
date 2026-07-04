import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/client';
import { devLogin } from '../helpers/auth';
import { resetDb } from '../helpers/db';

const app = createApp();

afterEach(resetDb);
afterAll(async () => prisma.$disconnect());

async function setUpAthlete(app: Express, appleUserId: string) {
  const { token } = await devLogin(app, { appleUserId });
  await request(app)
    .put('/api/v1/me/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ level: 'intermediate', hrMax: 188, hrRest: 52, ftpWatts: 230, thresholdPaceSecPerKm: 270, cssPaceSecPer100m: 95 });
  await request(app)
    .put('/api/v1/me/availability')
    .set('Authorization', `Bearer ${token}`)
    .send({ sessionsPerWeek: 5, maxSessionDurationMin: 75, availableDays: [2, 3, 4, 5, 6], preferredTimeSlots: ['evening'], mandatoryRestDays: [1] });
  const goal = await request(app)
    .post('/api/v1/me/goals')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'triathlonOlympic', targetDate: '2027-06-01T00:00:00Z', priority: 'a' });
  return { token, goalId: goal.body.id as string };
}

describe('POST /plans/generate', () => {
  it('generates a full periodized plan and persists it relationally', async () => {
    const { token, goalId } = await setUpAthlete(app, 'athlete-1');

    const res = await request(app)
      .post('/api/v1/plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ goalId, durationWeeks: 12 });

    expect(res.status).toBe(201);
    expect(res.body.durationWeeks).toBe(12);

    const microcycles = res.body.macrocycles.flatMap((mc: any) => mc.mesocycles.flatMap((me: any) => me.microcycles));
    expect(microcycles).toHaveLength(12);

    const workouts = microcycles.flatMap((mc: any) => mc.workouts);
    expect(workouts.some((w: any) => w.sport === 'swim')).toBe(true);
    expect(workouts.some((w: any) => w.sport === 'brick')).toBe(true);

    const dbWorkoutCount = await prisma.workout.count();
    expect(dbWorkoutCount).toBe(workouts.length);
  });

  it('archives the previously active plan when regenerating (e.g. after a goal change)', async () => {
    const { token, goalId } = await setUpAthlete(app, 'athlete-regen');

    const first = await request(app).post('/api/v1/plans/generate').set('Authorization', `Bearer ${token}`).send({ goalId, durationWeeks: 8 });
    expect(first.body.status).toBe('active');

    const second = await request(app).post('/api/v1/plans/generate').set('Authorization', `Bearer ${token}`).send({ goalId, durationWeeks: 12 });
    expect(second.body.status).toBe('active');

    const list = await request(app).get('/api/v1/plans').set('Authorization', `Bearer ${token}`);
    expect(list.body).toHaveLength(2);
    const statuses = list.body.map((p: any) => ({ id: p.id, status: p.status })).sort((a: any, b: any) => a.status.localeCompare(b.status));
    expect(statuses).toEqual([
      { id: second.body.id, status: 'active' },
      { id: first.body.id, status: 'archived' },
    ]);
  });

  it('rejects a goal that does not belong to the caller', async () => {
    const owner = await setUpAthlete(app, 'owner');
    const { token: otherToken } = await devLogin(app, { appleUserId: 'other' });

    const res = await request(app)
      .post('/api/v1/plans/generate')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ goalId: owner.goalId, durationWeeks: 8 });

    expect(res.status).toBe(404);
  });
});

describe('GET /plans and GET /plans/:id', () => {
  it('lists plans for the caller and fetches one by id', async () => {
    const { token, goalId } = await setUpAthlete(app, 'athlete-2');
    const generated = await request(app).post('/api/v1/plans/generate').set('Authorization', `Bearer ${token}`).send({ goalId, durationWeeks: 8 });

    const list = await request(app).get('/api/v1/plans').set('Authorization', `Bearer ${token}`);
    expect(list.body).toHaveLength(1);

    const single = await request(app).get(`/api/v1/plans/${generated.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(single.status).toBe(200);
    expect(single.body.id).toBe(generated.body.id);
  });

  it('returns 404 for a plan belonging to someone else', async () => {
    const a = await setUpAthlete(app, 'athlete-3');
    const generated = await request(app).post('/api/v1/plans/generate').set('Authorization', `Bearer ${a.token}`).send({ goalId: a.goalId, durationWeeks: 8 });
    const { token: otherToken } = await devLogin(app, { appleUserId: 'athlete-4' });

    const res = await request(app).get(`/api/v1/plans/${generated.body.id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});
