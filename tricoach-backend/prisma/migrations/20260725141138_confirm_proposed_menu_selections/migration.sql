-- Weekly menu proposals now land directly as CONFIRMED (no more "Valider" step) —
-- backfill any already-proposed rows so historical data matches.
UPDATE "menu_selections" SET "status" = 'CONFIRMED' WHERE "status" = 'PROPOSED';