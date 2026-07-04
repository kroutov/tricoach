import { Router } from 'express';
import { prisma } from '../../db/client';
import { generateWorkoutsICS } from './icsGenerator';

const router = Router();

/**
 * Public (no `requireAuth`) — calendar apps fetch this URL directly with no
 * `Authorization` header, so the capability lives in the `token` query param
 * itself (see `User.calendarToken` / `GET /me/calendar-token`). Mounted at
 * `/me/calendar.ics` *before* the `/me` router's `requireAuth` gate in
 * `app.ts` so this specific path never hits it.
 */
router.get('/', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : undefined;
  if (!token) {
    res.status(400).send('Missing token');
    return;
  }

  const user = await prisma.user.findUnique({ where: { calendarToken: token } });
  if (!user) {
    res.status(404).send('Invalid or revoked calendar token');
    return;
  }

  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: user.id, status: 'ACTIVE' },
    include: { macrocycles: { include: { mesocycles: { include: { microcycles: { include: { workouts: true } } } } } } },
  });

  const workouts = (plan?.macrocycles ?? []).flatMap((macrocycle) =>
    macrocycle.mesocycles.flatMap((mesocycle) => mesocycle.microcycles.flatMap((microcycle) => microcycle.workouts))
  );

  const ics = generateWorkoutsICS(
    workouts.map((workout) => ({
      id: workout.id,
      date: workout.date,
      title: workout.title,
      summary: workout.description,
      plannedDurationMin: workout.plannedDurationMin,
      estimatedTss: workout.estimatedTss,
    }))
  );

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="tricoach.ics"');
  res.send(ics);
});

export const calendarFeedRouter = router;
