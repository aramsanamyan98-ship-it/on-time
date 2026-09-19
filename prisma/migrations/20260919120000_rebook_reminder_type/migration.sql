-- "Ready to rebook?" win-back notification: scheduled some days after an
-- appointment's end_at, inviting the guest back for another visit — see
-- schema.prisma NotificationType comment.
ALTER TYPE "NotificationType" ADD VALUE 'rebook_reminder';
