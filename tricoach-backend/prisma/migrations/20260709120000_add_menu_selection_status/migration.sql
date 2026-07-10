-- CreateEnum
CREATE TYPE "MenuSelectionStatus" AS ENUM ('PROPOSED', 'CONFIRMED');

-- AlterTable
ALTER TABLE "menu_selections" ADD COLUMN "status" "MenuSelectionStatus" NOT NULL DEFAULT 'CONFIRMED';
