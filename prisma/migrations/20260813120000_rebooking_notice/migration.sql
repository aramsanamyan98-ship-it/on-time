-- Rebooking-assist feature: guest-facing notification prompting the guest
-- to pick a new slot after a *specialist*-initiated cancellation (direct
-- dashboard cancel, or a blocked-time conflict) — see schema.prisma
-- NotificationType comment.
ALTER TYPE "NotificationType" ADD VALUE 'rebooking_notice';
