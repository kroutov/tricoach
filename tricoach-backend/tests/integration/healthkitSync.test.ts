import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/client';
import { toDateOnly } from '../../src/lib/dateOnly';
import { devLogin } from '../helpers/auth';
import { resetDb } from '../helpers/db';

const app = createApp();

afterEach(resetDb);
afterAll(async () => prisma.$disconnect());

async function setUpPlan(appleUserId: string, startDaysAgo = 6) {
  const { token, user } = await devLogin(app, { appleUserId });
  await request(app).put('/api/v1/me/profile').set('Authorization', `Bearer ${token}`).send({ level: 'intermediate' });
  await request(app)
    .put('/api/v1/me/availability')
    .set('Authorization', `Bearer ${token}`)
    .send({ sessionsPerWeek: 5, maxSessionDurationMin: 75, availableDays: [2, 3, 4, 5, 6], preferredTimeSlots: [], mandatoryRestDays: [1] });
  const goal = await request(app)
    .post('/api/v1/me/goals')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'halfMarathon', targetDate: '2027-06-01T00:00:00Z', priority: 'a' });

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - startDaysAgo);
  const plan = await request(app)
    .post('/api/v1/plans/generate')
    .set('Authorization', `Bearer ${token}`)
    .send({ goalId: goal.body.id, durationWeeks: 12, startDate: startDate.toISOString() });

  return { token, userId: user.id as string, plan: plan.body };
}

describe('POST /integrations/healthkit/sync', () => {
  it('matches a synced activity to a planned workout, marks it completed, and stores health metrics', async () => {
    const { token, plan } = await setUpPlan('healthkit-athlete-1');
    const workout = plan.macrocycles[0].mesocycles[0].microcycles[0].workouts[0];

    const res = await request(app)
      .post('/api/v1/integrations/healthkit/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({
        activities: [
          {
            source: 'healthKit',
            externalId: 'hk-uuid-1',
            startTime: workout.date,
            durationS: workout.plannedDurationMin * 60,
            sport: workout.sport,
          },
        ],
        healthMetrics: [{ date: new Date().toISOString(), restingHr: 48, hrvMs: 65.4, sleepDurationMin: 420 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.activitiesIngested).toBe(1);

    const updatedWorkout = await prisma.workout.findUnique({ where: { id: workout.id } });
    expect(updatedWorkout?.status).toBe('COMPLETED');

    const metric = await prisma.healthMetricDaily.findFirst({ where: { restingHr: 48 } });
    expect(metric?.hrvMs).toBeCloseTo(65.4);
  });

  it('does not ingest the same externalId twice', async () => {
    const { token, plan } = await setUpPlan('healthkit-athlete-2');
    const workout = plan.macrocycles[0].mesocycles[0].microcycles[0].workouts[0];
    const payload = {
      activities: [{ source: 'healthKit', externalId: 'hk-dup', startTime: workout.date, durationS: 1800, sport: workout.sport }],
    };

    await request(app).post('/api/v1/integrations/healthkit/sync').set('Authorization', `Bearer ${token}`).send(payload);
    const second = await request(app).post('/api/v1/integrations/healthkit/sync').set('Authorization', `Bearer ${token}`).send(payload);

    expect(second.body.activitiesIngested).toBe(0);
    const count = await prisma.completedActivity.count({ where: { externalId: 'hk-dup' } });
    expect(count).toBe(1);
  });

  it('reduces next week\'s planned load when a synced HRV reading drops materially below the rolling baseline', async () => {
    const { token, userId, plan } = await setUpPlan('healthkit-athlete-hrv', 0);

    const baselineHrv = 60;
    for (let daysAgo = 6; daysAgo >= 1; daysAgo -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      await prisma.healthMetricDaily.create({ data: { userId, date: toDateOnly(date), hrvMs: baselineHrv } });
    }

    const microcycles = plan.macrocycles.flatMap((m: any) => m.mesocycles.flatMap((me: any) => me.microcycles));
    const now = new Date();
    const nextMicrocycle = microcycles.find((mc: any) => new Date(mc.startDate) > now);
    expect(nextMicrocycle).toBeDefined();
    const originalPlannedLoad = nextMicrocycle.plannedLoad;

    const res = await request(app)
      .post('/api/v1/integrations/healthkit/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ activities: [], healthMetrics: [{ date: new Date().toISOString(), hrvMs: baselineHrv * 0.6 }] }); // -40%

    expect(res.status).toBe(200);
    expect(res.body.adaptationEvents.some((e: any) => e.triggeredBy === 'physiologicalStrain')).toBe(true);

    const updatedMicrocycle = await prisma.microcycle.findUnique({ where: { id: nextMicrocycle.id } });
    expect(updatedMicrocycle?.plannedLoad).toBeLessThan(originalPlannedLoad);
  });
});
