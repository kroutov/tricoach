import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { workoutStatusMap } from '../../lib/enumMapping';
import { ApiError } from '../../middleware/errorHandler';
import { runAdaptation } from '../plans/adaptationRunner';
import { serializeWorkout } from '../plans/persistence';

const router = Router();

const completeSchema = z.object({
  status: z.enum(['completed', 'skipped']).default('completed'),
  actualDurationMin: z.number().int().min(1).max(600).optional(),
  rpe: z.number().int().min(1).max(10).optional(),
});

router.post('/:id/complete', async (req, res, next) => {
  try {
    const body = completeSchema.parse(req.body);

    const workout = await prisma.workout.findFirst({
      where: { id: req.params.id.toLowerCase(), microcycle: { mesocycle: { macrocycle: { plan: { userId: req.userId } } } } },
      include: { microcycle: { include: { mesocycle: { include: { macrocycle: { select: { planId: true } } } } } } },
    });
    if (!workout) throw new ApiError(404, 'workout_not_found');

    const planId = workout.microcycle.mesocycle.macrocycle.planId;
    const now = new Date();

    const updatedWorkout = await prisma.workout.update({
      where: { id: workout.id },
      data: { status: workoutStatusMap.toDb(body.status) },
    });

    if (body.status === 'completed' && body.actualDurationMin) {
      await prisma.completedActivity.create({
        data: {
          userId: req.userId!,
          workoutId: workout.id,
          source: 'MANUAL',
          sport: workout.sport,
          startTime: workout.date,
          durationS: body.actualDurationMin * 60,
        },
      });
    }

    const events = await runAdaptation(planId, req.userId!, now);

    res.json({ workout: serializeWorkout(updatedWorkout), adaptationEvents: events });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

const rescheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be yyyy-MM-dd'),
});

/**
 * Drag & drop rescheduling (plan §5 "PATCH /workouts/:id (déplacement
 * drag&drop, édition)"). Moves are constrained to the workout's own
 * microcycle week — periodization load per microcycle assumes every workout
 * date falls inside it — and are rejected outright if so. Landing on a
 * mandatory rest day or a date another session already occupies is still
 * allowed (bricks legitimately share a day) but reported back as a
 * non-blocking conflict for the UI to surface.
 *
 * `date` is a plain `yyyy-MM-dd` day (not a full instant): workout dates are
 * stored as UTC-midnight of their calendar day throughout this codebase
 * (see plan generation), so accepting a client-local instant here would let
 * Postgres's date-only column silently truncate it to the wrong UTC day for
 * any athlete east or west of UTC. Anchoring to UTC midnight ourselves from
 * the day string keeps this endpoint consistent with that convention.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const body = rescheduleSchema.parse(req.body);
    const newDate = new Date(`${body.date}T00:00:00.000Z`);
    if (Number.isNaN(newDate.getTime())) throw new ApiError(400, 'invalid_date');

    const workout = await prisma.workout.findFirst({
      where: { id: req.params.id.toLowerCase(), microcycle: { mesocycle: { macrocycle: { plan: { userId: req.userId } } } } },
      include: { microcycle: { include: { workouts: true } } },
    });
    if (!workout) throw new ApiError(404, 'workout_not_found');

    const { microcycle } = workout;
    if (newDate < microcycle.startDate || newDate > microcycle.endDate) {
      throw new ApiError(400, 'date_outside_week', {
        weekStart: microcycle.startDate,
        weekEnd: microcycle.endDate,
      });
    }

    const conflicts: string[] = [];

    const availability = await prisma.availability.findUnique({ where: { userId: req.userId } });
    const mandatoryRestDays = (availability?.mandatoryRestDays as number[] | null) ?? [];
    if (mandatoryRestDays.includes(newDate.getDay() + 1)) {
      conflicts.push('Ce jour est marqué comme jour de repos obligatoire.');
    }

    const sameDayWorkout = microcycle.workouts.find(
      (w) => w.id !== workout.id && w.date.toDateString() === newDate.toDateString()
    );
    if (sameDayWorkout) {
      conflicts.push(`Une autre séance est déjà prévue ce jour-là : « ${sameDayWorkout.title} ».`);
    }

    const updated = await prisma.workout.update({ where: { id: workout.id }, data: { date: newDate } });
    res.json({ workout: serializeWorkout(updated), conflicts });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

const calendarEventSchema = z.object({
  calendarEventId: z.string().nullable(),
});

router.patch('/:id/calendar-event', async (req, res, next) => {
  try {
    const body = calendarEventSchema.parse(req.body);
    const workout = await prisma.workout.findFirst({
      where: { id: req.params.id.toLowerCase(), microcycle: { mesocycle: { macrocycle: { plan: { userId: req.userId } } } } },
    });
    if (!workout) throw new ApiError(404, 'workout_not_found');

    const updated = await prisma.workout.update({ where: { id: workout.id }, data: { calendarEventId: body.calendarEventId } });
    res.json(serializeWorkout(updated));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

export const workoutsRouter = router;
