import { AthleteProfile, Availability, ConstraintLog, Goal, User } from '@prisma/client';
import { athleteLevelMap, goalPriorityMap, goalStatusMap, goalTypeMap } from '../../lib/enumMapping';

export function serializeUser(user: User) {
  return {
    id: user.id,
    appleUserId: user.appleUserId,
    email: user.email,
    fullName: user.fullName,
    createdAt: user.createdAt,
    hasCompletedOnboarding: user.hasCompletedOnboarding,
  };
}

export function serializeProfile(profile: AthleteProfile | null) {
  if (!profile) {
    return { level: 'beginner', updatedAt: new Date() };
  }
  return {
    age: profile.age,
    sex: profile.sex,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    level: athleteLevelMap.toApi(profile.level),
    yearsPractice: profile.yearsPractice,
    weeklyVolumeAvgMin: profile.weeklyVolumeAvgMin,
    hrMax: profile.hrMax,
    hrRest: profile.hrRest,
    ftpWatts: profile.ftpWatts,
    thresholdPaceSecPerKm: profile.thresholdPaceSecKm,
    cssPaceSecPer100m: profile.cssPaceSec100m,
    updatedAt: profile.updatedAt,
  };
}

export function serializeAvailability(availability: Availability | null) {
  if (!availability) {
    return {
      sessionsPerWeek: 4,
      maxSessionDurationMin: 90,
      availableDays: [2, 3, 5, 7],
      preferredTimeSlots: ['evening'],
      mandatoryRestDays: [1],
      updatedAt: new Date(),
    };
  }
  return {
    sessionsPerWeek: availability.sessionsPerWeek,
    maxSessionDurationMin: availability.maxSessionDurationMin,
    availableDays: availability.availableDays,
    preferredTimeSlots: availability.preferredTimeSlots,
    mandatoryRestDays: availability.mandatoryRestDays,
    updatedAt: availability.updatedAt,
  };
}

export function serializeGoal(goal: Goal) {
  return {
    id: goal.id,
    type: goalTypeMap.toApi(goal.type),
    targetDate: goal.targetDate,
    priority: goalPriorityMap.toApi(goal.priority),
    targetTimeSeconds: goal.targetTime,
    status: goalStatusMap.toApi(goal.status),
    createdAt: goal.createdAt,
  };
}

export function serializeCheckIn(checkIn: ConstraintLog) {
  return {
    id: checkIn.id,
    date: checkIn.date,
    injuries: (checkIn.injuries as string[] | null) ?? [],
    fatigueLevel: checkIn.fatigueLevel ?? 2,
    stressLevel: checkIn.stressLevel ?? 2,
    sleepHours: checkIn.sleepHours ?? 7.5,
  };
}
