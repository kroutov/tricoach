import { createApp } from '../src/app';
import { prisma } from '../src/db/client';
import { ingestActivities, type ActivityInput } from '../src/modules/integrations/activityIngestion';
import { devLogin } from './helpers/auth';
import { resetDb } from './helpers/db';

const app = createApp();

afterEach(resetDb);
afterAll(async () => prisma.$disconnect());

function activity(overrides: Partial<ActivityInput> = {}): ActivityInput {
  return {
    source: 'strava',
    externalId: `ext-${Math.random().toString(36).slice(2)}`,
    startTime: new Date('2026-07-06T08:00:00Z'),
    durationS: 1800,
    sport: 'run',
    ...overrides,
  };
}

describe('ingestActivities — cross-source dedup', () => {
  it('treats the same sport within a 5-minute window from a different source as a duplicate', async () => {
    const { user } = await devLogin(app);

    await ingestActivities(user.id, [activity({ source: 'strava', startTime: new Date('2026-07-06T08:00:00Z') })]);
    const result = await ingestActivities(user.id, [
      activity({ source: 'garmin', startTime: new Date('2026-07-06T08:03:00Z') }),
    ]);

    expect(result.activitiesIngested).toBe(0);
    const stored = await prisma.completedActivity.findMany({ where: { userId: user.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.source).toBe('STRAVA');
  });

  it('keeps sessions of the same sport more than 5 minutes apart as distinct', async () => {
    const { user } = await devLogin(app);

    await ingestActivities(user.id, [activity({ source: 'strava', startTime: new Date('2026-07-06T08:00:00Z') })]);
    const result = await ingestActivities(user.id, [
      activity({ source: 'garmin', startTime: new Date('2026-07-06T08:10:00Z') }),
    ]);

    expect(result.activitiesIngested).toBe(1);
    const stored = await prisma.completedActivity.findMany({ where: { userId: user.id } });
    expect(stored).toHaveLength(2);
  });

  it('keeps a same-time brick session logged as two different sports as distinct', async () => {
    const { user } = await devLogin(app);

    await ingestActivities(user.id, [activity({ source: 'strava', sport: 'bike', startTime: new Date('2026-07-06T08:00:00Z') })]);
    const result = await ingestActivities(user.id, [
      activity({ source: 'strava', sport: 'run', startTime: new Date('2026-07-06T08:00:00Z') }),
    ]);

    expect(result.activitiesIngested).toBe(1);
    const stored = await prisma.completedActivity.findMany({ where: { userId: user.id } });
    expect(stored).toHaveLength(2);
  });

  it('persists sport directly on the activity row', async () => {
    const { user } = await devLogin(app);
    await ingestActivities(user.id, [activity({ sport: 'swim' })]);
    const stored = await prisma.completedActivity.findFirst({ where: { userId: user.id } });
    expect(stored?.sport).toBe('SWIM');
  });
});
