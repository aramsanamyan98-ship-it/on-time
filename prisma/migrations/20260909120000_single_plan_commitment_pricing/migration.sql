-- 02_PRD.md Section 14 (final pricing model): collapses the two-tier
-- Starter/Pro model into a single plan. Feature access no longer depends on
-- `plan` at all — it's computed from trial/subscription dates (see
-- src/lib/subscription/trial.ts `hasActiveAccess`). The referral-driven
-- trial-extension mechanic is removed along with it (the trial is now a
-- flat, non-extendable 3 months), so the `referrals` table and the
-- specialist's `referral_code`/`referral_extensions_granted` bookkeeping go
-- too. `subscription_commitment_months` (1/3/6/12) and
-- `subscription_active_until` replace `plan` as the paid-access record —
-- both stay null until a specialist has ever subscribed, and are only ever
-- written by a manual/admin action (no billing integration exists yet).
-- DropForeignKey
ALTER TABLE "referrals" DROP CONSTRAINT "referrals_specialist_id_fkey";

-- DropIndex
DROP INDEX "specialists_referral_code_key";

-- AlterTable
ALTER TABLE "specialists" DROP COLUMN "plan",
DROP COLUMN "referral_code",
DROP COLUMN "referral_extensions_granted",
DROP COLUMN "subscription_prompt_dismissed_at",
ADD COLUMN     "subscription_active_until" TIMESTAMP(3),
ADD COLUMN     "subscription_commitment_months" INTEGER;

-- DropTable
DROP TABLE "referrals";

-- DropEnum
DROP TYPE "Plan";

-- DropEnum
DROP TYPE "ReferralStatus";
