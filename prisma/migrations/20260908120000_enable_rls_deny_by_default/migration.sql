-- Supabase's security advisor flags every public-schema table for having
-- Row Level Security (RLS) disabled. We never query through Supabase's
-- client library or its public PostgREST API (anon/authenticated keys) —
-- the app talks to Postgres exclusively via Prisma over DATABASE_URL/
-- DIRECT_URL (see src/lib/prisma.ts, prisma.config.ts), connecting as the
-- table-owning `postgres` role. Table owners bypass RLS by default (unless
-- FORCE ROW LEVEL SECURITY is also set, which we deliberately do NOT set
-- here), so simply enabling RLS with zero policies:
--   - blocks 100% of access from the anon/authenticated PostgREST roles
--     (deny-by-default: RLS enabled + no policies = no rows visible/
--     writable to any non-owner role), closing the advisor finding, and
--   - has zero effect on the app, since Prisma's connection never goes
--     through a non-owner role.
ALTER TABLE "public"."specialists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."working_hours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."portfolio_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."blocked_time" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."client_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_verification_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;

-- Prisma's own migration-history table also lives in the public schema and
-- is flagged the same way. It's never queried by app code (only by the
-- Prisma CLI, which connects as the same owning role), so this is safe too.
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
