import { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/client';
import { devLogin } from '../helpers/auth';
import { resetDb } from '../helpers/db';

const app = createApp();

afterEach(resetDb);
afterAll(async () => prisma.$disconnect());

async function setUpPlan(app: Express, appleUserId: string, startDate?: Date) {
  const { token } = await devLogin(app, { appleUserId });
  await request(app)
    .put('/api/v1/me/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ level: 'intermediate', hrMax: 188, hrRest: 52, thresholdPaceSecPerKm: 270 });
  await request(app)
    .put('/api/v1/me/availability')
    .set('Authorization', `Bearer ${token}`)
    .send({ sessionsPerWeek: 5, maxSessionDurationMin: 75, availableDays: [2, 3, 4, 5, 6], preferredTimeSlots: ['evening'], mandatoryRestDays: [1] });
  const goal = await request(app)
    .post('/api/v1/me/goals')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'halfMarathon', targetDate: '2027-06-01T00:00:00Z', priority: 'a' });

  // Start the plan 6 days ago so week 1's sessions already happened (date <= now)
  // while week 2 hasn't started yet (date > now) — makes the adaptation window deterministic.
  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

  const plan = await request(app)
    .post('/api/v1/plans/generate')
    .set('Authorization', `Bearer ${token}`)
    .send({ goalId: goal.body.id, durationWeeks: 12, startDate: (startDate ?? sixDaysAgo).toISOString() });

  return { token, plan: plan.body };
}

function firstWorkout(plan: any) {
  return plan.macrocycles[0].mesocycles[0].microcycles[0].workouts[0];
}

function firstWeekWorkouts(plan: any) {
  return plan.macrocycles[0].mesocycles[0].microcycles[0].workouts;
}

function nextMicrocycle(plan: any) {
  return plan.macrocycles[0].mesocycles[0].microcycles[1];
}

/** `PATCH /workouts/:id` takes a plain `yyyy-MM-dd` day — see the route for why. */
function dayString(date: string | Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

describe('POST /workouts/:id/complete', () => {
  it('marks the workout completed, logs a CompletedActivity, and nudges next week\'s load', async () => {
    const { token, plan } = await setUpPlan(app, 'workout-athlete-1');
    const nextWeekBefore = nextMicrocycle(plan);

    // Complete every session due this week (all already in the past, since
    // the plan was backdated) so the completion rate clears the 90% bar.
    let lastResponse;
    for (const workout of firstWeekWorkouts(plan)) {
      lastResponse = await request(app)
        .post(`/api/v1/workouts/${workout.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed', actualDurationMin: workout.plannedDurationMin, rpe: workout.rpeTarget ?? 5 });
    }

    expect(lastResponse!.status).toBe(200);
    expect(lastResponse!.body.workout.status).toBe('completed');
    expect(lastResponse!.body.adaptationEvents.length).toBeGreaterThan(0);
    expect(lastResponse!.body.adaptationEvents[0].triggeredBy).toBe('overperformance');

    const activityCount = await prisma.completedActivity.count();
    expect(activityCount).toBe(firstWeekWorkouts(plan).length);

    const updatedPlan = await request(app).get(`/api/v1/plans/${plan.id}`).set('Authorization', `Bearer ${token}`);
    const nextWeekAfter = nextMicrocycle(updatedPlan.body);
    expect(nextWeekAfter.plannedLoad).toBeGreaterThan(nextWeekBefore.plannedLoad);
  });

  it('freezes progression and skips the load bump when an injury was logged', async () => {
    const { token, plan } = await setUpPlan(app, 'workout-athlete-2');
    const workout = firstWorkout(plan);

    await request(app)
      .post('/api/v1/me/constraints')
      .set('Authorization', `Bearer ${token}`)
      .send({ injuries: ['tendinite'], fatigueLevel: 3, stressLevel: 3, sleepHours: 7 });

    const res = await request(app)
      .post(`/api/v1/workouts/${workout.id}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed', actualDurationMin: workout.plannedDurationMin });

    expect(res.body.adaptationEvents).toHaveLength(1);
    expect(res.body.adaptationEvents[0].triggeredBy).toBe('injuryFlag');
    expect(res.body.adaptationEvents[0].deltaLoadPercent).toBe(0);
  });

  it('does not repeat the same overperformance event when a not-yet-due workout is then marked skipped', async () => {
    // One day ago: exactly one session is already due (so completing it alone
    // clears the 90% bar), the rest of the week is still ahead of "now".
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const { token, plan } = await setUpPlan(app, 'workout-athlete-5', oneDayAgo);
    const [dueWorkout, upcomingWorkout] = firstWeekWorkouts(plan);

    const completeRes = await request(app)
      .post(`/api/v1/workouts/${dueWorkout.id}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed', actualDurationMin: dueWorkout.plannedDurationMin });

    expect(completeRes.body.adaptationEvents[0].triggeredBy).toBe('overperformance');

    const skipRes = await request(app)
      .post(`/api/v1/workouts/${upcomingWorkout.id}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'skipped' });

    expect(skipRes.body.workout.status).toBe('skipped');
    // The skip should count against the completion rate instead of being
    // invisible to the engine, so it must not repeat the same 100% event.
    expect(skipRes.body.adaptationEvents).not.toEqual(completeRes.body.adaptationEvents);
    const overperformance = skipRes.body.adaptationEvents.find((e: any) => e.triggeredBy === 'overperformance');
    expect(overperformance).toBeUndefined();
  });

  it('returns 404 when completing a workout that belongs to another user', async () => {
    const owner = await setUpPlan(app, 'workout-athlete-3');
    const { token: otherToken } = await devLogin(app, { appleUserId: 'workout-athlete-4' });
    const workout = firstWorkout(owner.plan);

    const res = await request(app)
      .post(`/api/v1/workouts/${workout.id}/complete`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: 'completed', actualDurationMin: 30 });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /workouts/:id (drag & drop reschedule)', () => {
  it('moves a workout within its week with no conflicts when the target day is free', async () => {
    const { token, plan } = await setUpPlan(app, 'reschedule-athlete-1');
    const microcycle = plan.macrocycles[0].mesocycles[0].microcycles[0];
    const workout = firstWorkout(plan);

    // Saturday (day 7): not in availableDays [2..6] and not the mandatory
    // rest day [1], so no session is ever scheduled there — a free target.
    const saturday = new Date(microcycle.startDate);
    while (saturday.getDay() + 1 !== 7) saturday.setDate(saturday.getDate() + 1);

    const res = await request(app)
      .patch(`/api/v1/workouts/${workout.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: dayString(saturday) });

    expect(res.status).toBe(200);
    expect(res.body.conflicts).toEqual([]);
    expect(dayString(res.body.workout.date)).toBe(dayString(saturday));
  });

  it('reports a conflict but still moves the workout onto a day another session already occupies', async () => {
    const { token, plan } = await setUpPlan(app, 'reschedule-athlete-2');
    const workouts = firstWeekWorkouts(plan);
    const [workoutA, workoutB] = workouts;

    const res = await request(app)
      .patch(`/api/v1/workouts/${workoutA.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: dayString(workoutB.date) });

    expect(res.status).toBe(200);
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0]).toContain(workoutB.title);
  });

  it('reports a conflict when moved onto the mandatory rest day', async () => {
    const { token, plan } = await setUpPlan(app, 'reschedule-athlete-3');
    const microcycle = plan.macrocycles[0].mesocycles[0].microcycles[0];
    const workout = firstWorkout(plan);

    // mandatoryRestDays: [1] (Sunday) in setUpPlan.
    const sunday = new Date(microcycle.startDate);
    while (sunday.getDay() + 1 !== 1) sunday.setDate(sunday.getDate() + 1);

    const res = await request(app)
      .patch(`/api/v1/workouts/${workout.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: dayString(sunday) });

    expect(res.status).toBe(200);
    expect(res.body.conflicts.some((c: string) => c.includes('repos obligatoire'))).toBe(true);
  });

  it('rejects moving a workout outside its own microcycle week', async () => {
    const { token, plan } = await setUpPlan(app, 'reschedule-athlete-4');
    const microcycle = plan.macrocycles[0].mesocycles[0].microcycles[0];
    const workout = firstWorkout(plan);

    const beyondWeek = new Date(microcycle.endDate);
    beyondWeek.setDate(beyondWeek.getDate() + 1);

    const res = await request(app)
      .patch(`/api/v1/workouts/${workout.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: dayString(beyondWeek) });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('date_outside_week');
  });

  it('returns 404 when rescheduling a workout that belongs to another user', async () => {
    const owner = await setUpPlan(app, 'reschedule-athlete-5');
    const { token: otherToken } = await devLogin(app, { appleUserId: 'reschedule-athlete-6' });
    const workout = firstWorkout(owner.plan);

    const res = await request(app)
      .patch(`/api/v1/workouts/${workout.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ date: dayString(workout.date) });

    expect(res.status).toBe(404);
  });
});
