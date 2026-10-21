-- Trial emails (trial_ending_soon / trial_ended): specialist-level
-- notifications with no appointment, so notifications_log.appointment_id
-- becomes nullable and a specialist_id column is added. The unique
-- (specialist_id, type) index enforces "each email at most once per
-- specialist" (NULLs are distinct in Postgres, so appointment rows are
-- unaffected). See schema.prisma NotificationType comment.
ALTER TYPE "NotificationType" ADD VALUE 'trial_ending_soon';
ALTER TYPE "NotificationType" ADD VALUE 'trial_ended';

-- AlterTable
ALTER TABLE "notifications_log" ADD COLUMN "specialist_id" TEXT,
ALTER COLUMN "appointment_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "notifications_log_specialist_id_type_key" ON "notifications_log"("specialist_id", "type");

-- AddForeignKey
ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
