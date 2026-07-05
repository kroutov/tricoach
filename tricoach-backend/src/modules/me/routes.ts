import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../../config';
import { prisma } from '../../db/client';
import { toDateOnly } from '../../lib/dateOnly';
import { athleteLevelMap, goalPriorityMap, goalStatusMap, goalTypeMap } from '../../lib/enumMapping';
import { ApiError } from '../../middleware/errorHandler';
import { serializeActivity, serializeAvailability, serializeCheckIn, serializeGoal, serializeProfile, serializeUser } from './serializers';

const router = Router();

// ---- User ----

router.get('/', async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  res.json(serializeUser(user));
});

const updateUserSchema = z.object({
  fullName: z.string().optional(),
  hasCompletedOnboarding: z.boolean().optional(),
});

router.put('/', async (req, res, next) => {
  try {
    const body = updateUserSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.userId }, data: body });
    res.json(serializeUser(user));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

// ---- Athlete profile ----

router.get('/profile', async (req, res) => {
  const profile = await prisma.athleteProfile.findUnique({ where: { userId: req.userId } });
  res.json(serializeProfile(profile));
});

const profileSchema = z.object({
  age: z.number().int().nullable().optional(),
  sex: z.enum(['male', 'female', 'other']).nullable().optional(),
  heightCm: z.number().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  yearsPractice: z.number().nullable().optional(),
  weeklyVolumeAvgMin: z.number().int().nullable().optional(),
  hrMax: z.number().int().nullable().optional(),
  hrRest: z.number().int().nullable().optional(),
  ftpWatts: z.number().int().nullable().optional(),
  thresholdPaceSecPerKm: z.number().int().nullable().optional(),
  cssPaceSecPer100m: z.number().int().nullable().optional(),
});

router.put('/profile', async (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const data = {
      age: body.age ?? null,
      sex: body.sex ?? null,
      heightCm: body.heightCm ?? null,
      weightKg: body.weightKg ?? null,
      level: athleteLevelMap.toDb(body.level),
      yearsPractice: body.yearsPractice ?? null,
      weeklyVolumeAvgMin: body.weeklyVolumeAvgMin ?? null,
      hrMax: body.hrMax ?? null,
      hrRest: body.hrRest ?? null,
      ftpWatts: body.ftpWatts ?? null,
      thresholdPaceSecKm: body.thresholdPaceSecPerKm ?? null,
      cssPaceSec100m: body.cssPaceSecPer100m ?? null,
    };
    const profile = await prisma.athleteProfile.upsert({
      where: { userId: req.userId! },
      update: data,
      create: { ...data, userId: req.userId! },
    });
    res.json(serializeProfile(profile));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

// ---- Availability ----

router.get('/availability', async (req, res) => {
  const availability = await prisma.availability.findUnique({ where: { userId: req.userId } });
  res.json(serializeAvailability(availability));
});

const availabilitySchema = z.object({
  sessionsPerWeek: z.number().int().min(1).max(14),
  maxSessionDurationMin: z.number().int().min(10).max(600),
  availableDays: z.array(z.number().int().min(1).max(7)),
  preferredTimeSlots: z.array(z.string()),
  mandatoryRestDays: z.array(z.number().int().min(1).max(7)),
});

router.put('/availability', async (req, res, next) => {
  try {
    const body = availabilitySchema.parse(req.body);
    const availability = await prisma.availability.upsert({
      where: { userId: req.userId! },
      update: body,
      create: { ...body, userId: req.userId! },
    });
    res.json(serializeAvailability(availability));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

// ---- Goals ----

router.get('/goals', async (req, res) => {
  const goals = await prisma.goal.findMany({ where: { userId: req.userId }, orderBy: { targetDate: 'asc' } });
  res.json(goals.map(serializeGoal));
});

const goalSchema = z.object({
  type: z.enum([
    'triathlonSprint', 'triathlonOlympic', 'duathlon', 'run10k', 'halfMarathon',
    'marathon', 'ironman', 'halfIronman', 'improveVMA', 'weightLoss', 'generalEndurance',
  ]),
  targetDate: z.coerce.date(),
  priority: z.enum(['a', 'b', 'c']),
  targetTimeSeconds: z.number().int().nullable().optional(),
  status: z.enum(['active', 'achieved', 'abandoned']).optional(),
});

router.post('/goals', async (req, res, next) => {
  try {
    const body = goalSchema.parse(req.body);
    const goal = await prisma.goal.create({
      data: {
        userId: req.userId!,
        type: goalTypeMap.toDb(body.type),
        targetDate: body.targetDate,
        priority: goalPriorityMap.toDb(body.priority),
        targetTime: body.targetTimeSeconds ?? null,
        status: goalStatusMap.toDb(body.status ?? 'active'),
      },
    });
    res.status(201).json(serializeGoal(goal));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

router.put('/goals/:id', async (req, res, next) => {
  try {
    const body = goalSchema.parse(req.body);
    const existing = await prisma.goal.findFirst({ where: { id: req.params.id.toLowerCase(), userId: req.userId } });
    if (!existing) throw new ApiError(404, 'goal_not_found');

    const goal = await prisma.goal.update({
      where: { id: existing.id },
      data: {
        type: goalTypeMap.toDb(body.type),
        targetDate: body.targetDate,
        priority: goalPriorityMap.toDb(body.priority),
        targetTime: body.targetTimeSeconds ?? null,
        status: goalStatusMap.toDb(body.status ?? 'active'),
      },
    });
    res.json(serializeGoal(goal));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

router.delete('/goals/:id', async (req, res, next) => {
  try {
    const existing = await prisma.goal.findFirst({ where: { id: req.params.id.toLowerCase(), userId: req.userId } });
    if (!existing) throw new ApiError(404, 'goal_not_found');
    await prisma.goal.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---- Constraint check-ins ----

router.get('/constraints', async (req, res) => {
  const days = Number(req.query.days ?? 14);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const checkIns = await prisma.constraintLog.findMany({
    where: { userId: req.userId, date: { gte: since } },
    orderBy: { date: 'desc' },
  });
  res.json(checkIns.map(serializeCheckIn));
});

const checkInSchema = z.object({
  date: z.coerce.date().optional(),
  injuries: z.array(z.string()).default([]),
  fatigueLevel: z.number().int().min(1).max(5),
  stressLevel: z.number().int().min(1).max(5),
  sleepHours: z.number().min(0).max(24),
});

router.post('/constraints', async (req, res, next) => {
  try {
    const body = checkInSchema.parse(req.body);
    const checkIn = await prisma.constraintLog.create({
      data: {
        userId: req.userId!,
        date: toDateOnly(body.date ?? new Date()),
        injuries: body.injuries,
        fatigueLevel: body.fatigueLevel,
        stressLevel: body.stressLevel,
        sleepHours: body.sleepHours,
      },
    });
    res.status(201).json(serializeCheckIn(checkIn));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

// ---- Activity history ----

/**
 * All synced/completed activities, most recent first — regardless of
 * source (Strava today, Garmin/HealthKit once viable). Cross-source
 * duplicates are already filtered out at ingestion time, not here (see
 * `ingestActivities` in src/modules/integrations/activityIngestion.ts).
 */
router.get('/activities', async (req, res) => {
  const activities = await prisma.completedActivity.findMany({
    where: { userId: req.userId },
    orderBy: { startTime: 'desc' },
  });
  res.json(activities.map(serializeActivity));
});

// ---- Calendar feed token ----

function calendarUrl(token: string): string {
  return `${config.backendPublicUrl}/api/v1/me/calendar.ics?token=${token}`;
}

/** Returns the existing token (creating one on first call) so the profile page always has a subscribable URL. */
router.get('/calendar-token', async (req, res) => {
  let user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!user.calendarToken) {
    user = await prisma.user.update({ where: { id: req.userId }, data: { calendarToken: crypto.randomBytes(24).toString('hex') } });
  }
  res.json({ token: user.calendarToken, url: calendarUrl(user.calendarToken!) });
});

/** Issues a brand-new token, invalidating any previously subscribed feed URL (e.g. if it leaked). */
router.post('/calendar-token/rotate', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { calendarToken: crypto.randomBytes(24).toString('hex') },
  });
  res.json({ token: user.calendarToken, url: calendarUrl(user.calendarToken!) });
});

export const meRouter = router;
