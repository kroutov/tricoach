-- AlterTable
ALTER TABLE "users" ADD COLUMN     "full_name" TEXT,
ADD COLUMN     "has_completed_onboarding" BOOLEAN NOT NULL DEFAULT false;
