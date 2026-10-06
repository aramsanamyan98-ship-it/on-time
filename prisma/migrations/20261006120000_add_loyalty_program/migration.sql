-- CreateEnum
CREATE TYPE "LoyaltyRuleType" AS ENUM ('everyNthFree', 'percentOffAfterN');

-- CreateTable
CREATE TABLE "loyalty_programs" (
    "id" TEXT NOT NULL,
    "specialist_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rule_type" "LoyaltyRuleType" NOT NULL,
    "threshold" INTEGER NOT NULL,
    "reward_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_programs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_programs_specialist_id_key" ON "loyalty_programs"("specialist_id");

-- AddForeignKey
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deny-by-default RLS, matching 20260908120000_enable_rls_deny_by_default.
ALTER TABLE "public"."loyalty_programs" ENABLE ROW LEVEL SECURITY;
