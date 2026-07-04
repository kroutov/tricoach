import { prisma } from '../../src/db/client';

/** Wipes all tables in FK-safe order. Run between tests so integration tests stay isolated. */
export async function resetDb(): Promise<void> {
  await prisma.completedActivity.deleteMany();
  await prisma.adaptationEvent.deleteMany();
  await prisma.healthMetricDaily.deleteMany();
  await prisma.constraintLog.deleteMany();
  await prisma.deviceConnection.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.trainingPlan.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.athleteProfile.deleteMany();
  await prisma.user.deleteMany();
}
