-- 02_PRD.md Section 14 (updated) / 08_Roadmap.md Phase 7 follow-up:
-- the 30-day + 10-booking-milestone trial extension is replaced by a flat
-- 3-month trial, so the marker column for that one-time grant is dropped.
ALTER TABLE "specialists" DROP COLUMN "booking_milestone_extended_at";
