-- AlterEnum
ALTER TYPE "ActivitySource" ADD VALUE 'GARMIN';

-- AlterEnum
ALTER TYPE "IntegrationProvider" ADD VALUE 'GARMIN';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "calendar_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_calendar_token_key" ON "users"("calendar_token");
