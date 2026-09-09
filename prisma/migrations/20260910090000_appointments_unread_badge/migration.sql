-- Dashboard nav unread-appointments badge: tracks when a specialist last
-- viewed the Appointments page. Null means "never viewed" (see
-- src/lib/dashboard/appointments-badge.ts).
-- AlterTable
ALTER TABLE "specialists" ADD COLUMN     "appointments_last_viewed_at" TIMESTAMP(3);
