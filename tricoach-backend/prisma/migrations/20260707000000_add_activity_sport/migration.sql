-- Records sport directly on the activity instead of only via the optional
-- workout relation, so unmatched activities (no planned workout) still show
-- a sport, and cross-source duplicate detection (same sport + close start
-- time) has something to match on.
ALTER TABLE "completed_activities" ADD COLUMN "sport" "SportType";

-- Backfill from the matched workout where one exists.
UPDATE "completed_activities" ca
SET "sport" = w."sport"
FROM "workouts" w
WHERE ca."workout_id" = w."id" AND ca."sport" IS NULL;
