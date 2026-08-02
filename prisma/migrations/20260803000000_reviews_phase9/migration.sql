-- 08_Roadmap.md Phase 9 / 02_PRD.md Section 14: guest reviews (Starter tier
-- and above). New notification type used to email guests a "leave a
-- review" link once their appointment has passed.
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'review_request';

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "specialist_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_appointment_id_key" ON "reviews"("appointment_id");

-- CreateIndex
CREATE INDEX "reviews_specialist_id_idx" ON "reviews"("specialist_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
