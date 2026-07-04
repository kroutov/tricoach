import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/client';
import { devLogin } from '../helpers/auth';
import { resetDb } from '../helpers/db';

const app = createApp();

afterEach(resetDb);
afterAll(async () => prisma.$disconnect());

describe('GET /dashboard/summary', () => {
  it('reports no active plan before onboarding is done', async () => {
    const { token } = await devLogin(app);
    const res = await request(app).get('/api/v1/dashboard/summary').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.hasActivePlan).toBe(false);
  });

  it('summarizes the current week once a plan exists', async () => {
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

    const res = await request(app).get('/api/v1/dashboard/summary').set('Authorization', `Bearer ${token}`);
    expect(res.body.hasActivePlan).toBe(true);
    expect(res.body.weekNumber).toBe(1);
    expect(res.body.durationWeeks).toBe(8);
    expect(Array.isArray(res.body.upcomingWorkouts)).toBe(true);
  });
});

describe('GET /dashboard/analytics', () => {
  it('reports no active plan before onboarding is done', async () => {
    const { token } = await devLogin(app);
    const res = await request(app).get('/api/v1/dashboard/analytics').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.hasActivePlan).toBe(false);
  });

  it('reflects a completed workout in the weekly load and zone distribution', async () => {
    const { token } = await devLogin(app);
    await request(app).put('/api/v1/me/profile').set('Authorization', `Bearer ${token}`).send({ level: 'beginner' });
    await request(app)
      .put('/api/v1/me/availability')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionsPerWeek: 4, maxSessionDurationMin: 60, availableDays: [1, 2, 4, 6, 7], preferredTimeSlots: [], mandatoryRestDays: [] });
    const goal = await request(app)
      .post('/api/v1/me/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'run10k', targetDate: '2027-01-01T00:00:00Z', priority: 'a' });
    const generated = await request(app)
      .post('/api/v1/plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ goalId: goal.body.id, durationWeeks: 8 });

    const plan = await request(app).get(`/api/v1/plans/${generated.body.id}`).set('Authorization', `Bearer ${token}`);
    const firstWorkout = plan.body.macrocycles[0].mesocycles[0].microcycles[0].workouts[0];

    await request(app)
      .post(`/api/v1/workouts/${firstWorkout.id}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed', actualDurationMin: firstWorkout.plannedDurationMin, rpe: 5 });

    const res = await request(app).get('/api/v1/dashboard/analytics').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.hasActivePlan).toBe(true);
    expect(res.body.weeklyLoad[0].completedLoad).toBeGreaterThan(0);
    expect(res.body.weeklyLoad[0].plannedLoad).toBeGreaterThanOrEqual(res.body.weeklyLoad[0].completedLoad);

    const completedCount = res.body.zoneDistribution.reduce((sum: number, z: { count: number }) => sum + z.count, 0);
    expect(completedCount).toBe(1);

    expect(Array.isArray(res.body.loadForm)).toBe(true);
    expect(res.body.loadForm.length).toBeGreaterThan(0);
    expect(res.body.loadForm[res.body.loadForm.length - 1].ctl).toBeGreaterThan(0);

    expect(res.body.vo2maxTrend).toEqual([]);
  });
});
