-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('booking_confirmation', 'reminder', 'cancellation', 'new_booking_alert');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'whatsapp', 'telegram', 'sms');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('queued', 'sent', 'failed');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "guest_locale" "Language" NOT NULL DEFAULT 'am';

-- CreateTable
CREATE TABLE "notifications_log" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'email',
    "recipient" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'queued',
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "attempted_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_log_status_scheduled_for_idx" ON "notifications_log"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "notifications_log_appointment_id_idx" ON "notifications_log"("appointment_id");

-- AddForeignKey
ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
