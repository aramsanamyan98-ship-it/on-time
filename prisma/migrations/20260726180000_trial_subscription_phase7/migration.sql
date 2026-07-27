-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('invited', 'booked_first_appointment');

-- AlterTable
ALTER TABLE "specialists" ADD COLUMN "referral_code" TEXT,
ADD COLUMN "booking_milestone_extended_at" TIMESTAMP(3),
ADD COLUMN "referral_extensions_granted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "subscription_prompt_dismissed_at" TIMESTAMP(3);

-- Backfill referral_code for any pre-existing rows before enforcing
-- NOT NULL + uniqueness (mirrors the random-suffix approach in
-- src/lib/slug.ts, just inline since this only ever runs once per row).
UPDATE "specialists" SET "referral_code" = upper(substr(md5(random()::text || id), 1, 10)) WHERE "referral_code" IS NULL;

ALTER TABLE "specialists" ALTER COLUMN "referral_code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "specialists_referral_code_key" ON "specialists"("referral_code");

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "specialist_id" TEXT NOT NULL,
    "referred_email" TEXT,
    "referred_phone" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'invited',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referrals_specialist_id_idx" ON "referrals"("specialist_id");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
