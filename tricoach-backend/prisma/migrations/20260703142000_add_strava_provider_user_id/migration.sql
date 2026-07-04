-- AlterTable
ALTER TABLE "device_connections" ADD COLUMN     "provider_user_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "device_connections_provider_provider_user_id_key" ON "device_connections"("provider", "provider_user_id");

