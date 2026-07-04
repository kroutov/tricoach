import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { adaptationTriggerMap } from '../../lib/enumMapping';
import { ApiError } from '../../middleware/errorHandler';
import { uuidString } from '../../lib/zodHelpers';
import { generatePlan } from './engine/ruleBasedPlanStrategy';
import { buildContextForUser, findPlanWithTree, listPlansForUser, persistPlan, serializePlan } from './persistence';

const router = Router();

const generateSchema = z.object({
  goalId: uuidString,
  durationWeeks: z.number().int().min(1).max(52).optional(),
  startDate: z.coerce.date().optional(),
});

router.post('/generate', async (req, res, next) => {
  try {
    const body = generateSchema.parse(req.body);
    const context = await buildContextForUser(req.userId!, body.goalId, body.durationWeeks, body.startDate);
    const plan = generatePlan(context);

    // A user can regenerate after changing their goal/availability (see
    // Goals management, plan §7) — archive whatever was active so
    // `fetchActivePlan` never has to pick between two ACTIVE rows.
    await prisma.trainingPlan.updateMany({ where: { userId: req.userId!, status: 'ACTIVE' }, data: { status: 'ARCHIVED' } });
    await persistPlan(req.userId!, plan);

    const persisted = await findPlanWithTree(plan.id, req.userId!);
    res.status(201).json(serializePlan(persisted!));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const plans = await listPlansForUser(req.userId!);
    res.json(plans.map(serializePlan));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const plan = await findPlanWithTree(req.params.id.toLowerCase(), req.userId!);
    if (!plan) throw new ApiError(404, 'plan_not_found');
    res.json(serializePlan(plan));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/adaptation-events', async (req, res, next) => {
  try {
    const plan = await prisma.trainingPlan.findFirst({ where: { id: req.params.id.toLowerCase(), userId: req.userId } });
    if (!plan) throw new ApiError(404, 'plan_not_found');

    const events = await prisma.adaptationEvent.findMany({ where: { planId: plan.id }, orderBy: { createdAt: 'desc' } });
    res.json(
      events.map((e) => ({
        id: e.id,
        planId: e.planId,
        triggeredBy: adaptationTriggerMap.toApi(e.triggeredBy),
        actionTaken: e.actionTaken,
        deltaLoadPercent: e.deltaLoad,
        createdAt: e.createdAt,
      }))
    );
  } catch (err) {
    next(err);
  }
});

export const plansRouter = router;
