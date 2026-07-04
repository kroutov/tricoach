import { Router } from 'express';
import { prisma } from '../../db/client';
import { macrocyclePhaseMap } from '../../lib/enumMapping';
import { serializeWorkout } from '../plans/persistence';
import { computeLoadForm, computeWeeklyLoad, computeZoneDistribution } from './analytics';

const router = Router();

router.get('/summary', async (req, res, next) => {
  try {
    const now = new Date();
    const plan = await prisma.trainingPlan.findFirst({
      where: { userId: req.userId, status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
      include: {
        macrocycles: {
          include: { mesocycles: { include: { microcycles: { include: { workouts: true } } } } },
        },
      },
    });

    if (!plan) {
      res.json({ hasActivePlan: false });
      return;
    }

    const allMicrocycles = plan.macrocycles.flatMap((mc) => mc.mesocycles.flatMap((me) => me.microcycles));
    const currentMicrocycle = allMicrocycles.find((mc) => now >= mc.startDate && now <= mc.endDate);
    const currentMacrocycle = plan.macrocycles.find((mc) => now >= mc.startDate && now <= mc.endDate);

    const weekCompletedLoad = currentMicrocycle
      ? currentMicrocycle.workouts.filter((w) => w.status === 'COMPLETED').reduce((sum, w) => sum + (w.estimatedTss ?? 0), 0)
      : 0;
    const weekPlannedLoad = currentMicrocycle?.plannedLoad ?? 0;

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const upcomingWorkouts = plan.macrocycles
      .flatMap((mc) => mc.mesocycles.flatMap((me) => me.microcycles.flatMap((mic) => mic.workouts)))
      .filter((w) => w.date >= todayStart && w.status === 'PLANNED')
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 3);

    res.json({
      hasActivePlan: true,
      planId: plan.id,
      weekNumber: currentMicrocycle?.weekNumber ?? null,
      durationWeeks: plan.durationWeeks,
      isRecoveryWeek: currentMicrocycle?.isRecoveryWeek ?? false,
      currentPhase: currentMacrocycle ? macrocyclePhaseMap.toApi(currentMacrocycle.phase) : null,
      weekCompletedLoad,
      weekPlannedLoad,
      upcomingWorkouts: upcomingWorkouts.map(serializeWorkout),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/analytics', async (req, res, next) => {
  try {
    const plan = await prisma.trainingPlan.findFirst({
      where: { userId: req.userId, status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
      include: {
        macrocycles: {
          include: { mesocycles: { include: { microcycles: { include: { workouts: true } } } } },
        },
      },
    });

    if (!plan) {
      res.json({ hasActivePlan: false });
      return;
    }

    const allMicrocycles = plan.macrocycles.flatMap((mc) => mc.mesocycles.flatMap((me) => me.microcycles));
    const allWorkouts = allMicrocycles.flatMap((mc) => mc.workouts);

    const weeklyLoad = computeWeeklyLoad(allMicrocycles);
    const zoneDistribution = computeZoneDistribution(allWorkouts);

    const dailyLoads = new Map<string, number>();
    for (const w of allWorkouts) {
      if (w.status !== 'COMPLETED') continue;
      const key = w.date.toISOString().slice(0, 10);
      dailyLoads.set(key, (dailyLoads.get(key) ?? 0) + (w.estimatedTss ?? 0));
    }
    const now = new Date();
    const loadForm = computeLoadForm(dailyLoads, plan.startDate, now < plan.endDate ? now : plan.endDate);

    const vo2maxRows = await prisma.healthMetricDaily.findMany({
      where: { userId: req.userId, vo2max: { not: null } },
      orderBy: { date: 'asc' },
      take: 90,
    });

    res.json({
      hasActivePlan: true,
      weeklyLoad,
      loadForm,
      zoneDistribution,
      vo2maxTrend: vo2maxRows.map((r) => ({ date: r.date, vo2max: r.vo2max })),
    });
  } catch (err) {
    next(err);
  }
});

export const dashboardRouter = router;
