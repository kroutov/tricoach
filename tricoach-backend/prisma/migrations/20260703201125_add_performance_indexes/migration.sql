-- CreateIndex
CREATE INDEX "adaptation_events_plan_id_idx" ON "adaptation_events"("plan_id");

-- CreateIndex
CREATE INDEX "completed_activities_user_id_idx" ON "completed_activities"("user_id");

-- CreateIndex
CREATE INDEX "completed_activities_workout_id_idx" ON "completed_activities"("workout_id");

-- CreateIndex
CREATE INDEX "constraints_log_user_id_date_idx" ON "constraints_log"("user_id", "date");

-- CreateIndex
CREATE INDEX "goals_user_id_idx" ON "goals"("user_id");

-- CreateIndex
CREATE INDEX "macrocycles_plan_id_idx" ON "macrocycles"("plan_id");

-- CreateIndex
CREATE INDEX "mesocycles_macrocycle_id_idx" ON "mesocycles"("macrocycle_id");

-- CreateIndex
CREATE INDEX "microcycles_mesocycle_id_idx" ON "microcycles"("mesocycle_id");

-- CreateIndex
CREATE INDEX "training_plans_user_id_status_idx" ON "training_plans"("user_id", "status");

-- CreateIndex
CREATE INDEX "workouts_microcycle_id_idx" ON "workouts"("microcycle_id");
