-- Google Sign-In removed (persistent integration issues in production) — drop the
-- now-unused column. Safe: confirmed no non-null google_id rows exist.
ALTER TABLE "users" DROP COLUMN "google_id";
