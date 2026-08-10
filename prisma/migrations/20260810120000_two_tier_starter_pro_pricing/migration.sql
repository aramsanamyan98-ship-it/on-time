-- 02_PRD.md Section 14 (final pricing model): collapses the old three-tier
-- Basic/Starter/Pro structure into two paid tiers, Starter and Pro. Basic
-- is dropped entirely — existing specialists on "basic" are remapped onto
-- "starter" (the new baseline paid tier) before the enum is narrowed, since
-- "basic" won't exist in the new type.
UPDATE "specialists" SET "plan" = 'starter' WHERE "plan" = 'basic';

-- AlterEnum
BEGIN;
CREATE TYPE "Plan_new" AS ENUM ('starter', 'pro');
ALTER TABLE "specialists" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "specialists" ALTER COLUMN "plan" TYPE "Plan_new" USING ("plan"::text::"Plan_new");
ALTER TYPE "Plan" RENAME TO "Plan_old";
ALTER TYPE "Plan_new" RENAME TO "Plan";
DROP TYPE "Plan_old";
ALTER TABLE "specialists" ALTER COLUMN "plan" SET DEFAULT 'starter';
COMMIT;
