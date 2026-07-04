-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('RUN', 'BIKE', 'SWIM', 'BRICK', 'STRENGTH', 'REST');

-- CreateEnum
CREATE TYPE "AthleteLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('TRIATHLON_SPRINT', 'TRIATHLON_OLYMPIC', 'DUATHLON', 'RUN_10K', 'HALF_MARATHON', 'MARATHON', 'IRONMAN', 'HALF_IRONMAN', 'IMPROVE_VMA', 'WEIGHT_LOSS', 'GENERAL_ENDURANCE');

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MacrocyclePhase" AS ENUM ('BASE', 'BUILD', 'PEAK', 'TAPER', 'TRANSITION');

-- CreateEnum
CREATE TYPE "WorkoutIntensity" AS ENUM ('EASY', 'MODERATE', 'HARD');

-- CreateEnum
CREATE TYPE "WorkoutStatus" AS ENUM ('PLANNED', 'COMPLETED', 'SKIPPED', 'MODIFIED');

-- CreateEnum
CREATE TYPE "ActivitySource" AS ENUM ('HEALTHKIT', 'STRAVA', 'MANUAL');

-- CreateEnum
CREATE TYPE "AdaptationTrigger" AS ENUM ('MISSED_WORKOUT', 'OVERPERFORMANCE', 'UNDERPERFORMANCE', 'HIGH_FATIGUE', 'INJURY_FLAG', 'LOW_RECOVERY');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('STRAVA', 'HEALTHKIT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "apple_user_id" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "age" INTEGER,
    "sex" TEXT,
    "height_cm" DOUBLE PRECISION,
    "weight_kg" DOUBLE PRECISION,
    "level" "AthleteLevel" NOT NULL DEFAULT 'BEGINNER',
    "years_practice" DOUBLE PRECISION,
    "weekly_volume_avg_min" INTEGER,
    "hr_max" INTEGER,
    "hr_rest" INTEGER,
    "ftp_watts" INTEGER,
    "threshold_pace_sec_per_km" INTEGER,
    "css_pace_sec_per_100m" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "GoalType" NOT NULL,
    "target_date" TIMESTAMP(3) NOT NULL,
    "priority" "GoalPriority" NOT NULL DEFAULT 'B',
    "target_time_seconds" INTEGER,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availabilities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sessions_per_week" INTEGER NOT NULL,
    "max_session_duration_min" INTEGER NOT NULL,
    "available_days" JSONB NOT NULL,
    "preferred_time_slots" JSONB NOT NULL,
    "mandatory_rest_days" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constraints_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "injuries" JSONB,
    "fatigue_level" INTEGER,
    "stress_level" INTEGER,
    "sleep_hours" DOUBLE PRECISION,

    CONSTRAINT "constraints_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "duration_weeks" INTEGER NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "generation_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "macrocycles" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phase" "MacrocyclePhase" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,

    CONSTRAINT "macrocycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesocycles" (
    "id" TEXT NOT NULL,
    "macrocycle_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "load_target" DOUBLE PRECISION,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,

    CONSTRAINT "mesocycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "microcycles" (
    "id" TEXT NOT NULL,
    "mesocycle_id" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_recovery_week" BOOLEAN NOT NULL DEFAULT false,
    "planned_load" DOUBLE PRECISION,

    CONSTRAINT "microcycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" TEXT NOT NULL,
    "microcycle_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sport" "SportType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "planned_duration_min" INTEGER NOT NULL,
    "planned_distance_m" INTEGER,
    "estimated_tss" DOUBLE PRECISION,
    "estimated_trimp" DOUBLE PRECISION,
    "rpe_target" INTEGER,
    "intensity" "WorkoutIntensity" NOT NULL,
    "status" "WorkoutStatus" NOT NULL DEFAULT 'PLANNED',
    "calendar_event_id" TEXT,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completed_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workout_id" TEXT,
    "source" "ActivitySource" NOT NULL,
    "external_id" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "duration_s" INTEGER NOT NULL,
    "distance_m" DOUBLE PRECISION,
    "avg_hr" INTEGER,
    "max_hr" INTEGER,
    "avg_power" INTEGER,
    "avg_pace_sec_per_km" INTEGER,
    "elevation_gain_m" DOUBLE PRECISION,
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "completed_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_metrics_daily" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "resting_hr" INTEGER,
    "hrv_ms" DOUBLE PRECISION,
    "vo2max" DOUBLE PRECISION,
    "sleep_duration_min" INTEGER,
    "sleep_quality" INTEGER,
    "training_load_acute" DOUBLE PRECISION,
    "training_load_chronic" DOUBLE PRECISION,
    "form_score" DOUBLE PRECISION,

    CONSTRAINT "health_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adaptation_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "triggered_by" "AdaptationTrigger" NOT NULL,
    "action_taken" TEXT NOT NULL,
    "delta_load" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adaptation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "access_token_encrypted" TEXT,
    "refresh_token_encrypted" TEXT,
    "expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'ios',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_apple_user_id_key" ON "users"("apple_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_profiles_user_id_key" ON "athlete_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "availabilities_user_id_key" ON "availabilities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "health_metrics_daily_user_id_date_key" ON "health_metrics_daily"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "device_connections_user_id_provider_key" ON "device_connections"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_user_id_device_token_key" ON "push_tokens"("user_id", "device_token");

-- AddForeignKey
ALTER TABLE "athlete_profiles" ADD CONSTRAINT "athlete_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraints_log" ADD CONSTRAINT "constraints_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "macrocycles" ADD CONSTRAINT "macrocycles_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "training_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesocycles" ADD CONSTRAINT "mesocycles_macrocycle_id_fkey" FOREIGN KEY ("macrocycle_id") REFERENCES "macrocycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "microcycles" ADD CONSTRAINT "microcycles_mesocycle_id_fkey" FOREIGN KEY ("mesocycle_id") REFERENCES "mesocycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_microcycle_id_fkey" FOREIGN KEY ("microcycle_id") REFERENCES "microcycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completed_activities" ADD CONSTRAINT "completed_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completed_activities" ADD CONSTRAINT "completed_activities_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_metrics_daily" ADD CONSTRAINT "health_metrics_daily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adaptation_events" ADD CONSTRAINT "adaptation_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adaptation_events" ADD CONSTRAINT "adaptation_events_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "training_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_connections" ADD CONSTRAINT "device_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
