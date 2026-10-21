import "server-only";
import { prisma } from "@/lib/prisma";
import {
  TRIAL_EMAIL_TYPES,
  TRIAL_ENDED_LOOKBACK_DAYS,
  TRIAL_ENDING_SOON_DAYS,
  getEligibleTrialEmail,
  type TrialEmailType,
} from "@/lib/notifications/trial-emails";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Called from the daily cron (src/app/api/notifications/process/route.ts)
 * before the queue is drained: finds specialists whose trial is within
 * TRIAL_ENDING_SOON_DAYS of ending or over for under
 * TRIAL_ENDED_LOOKBACK_DAYS, and inserts one queued
 * `notifications_log` row per (specialist, type) — the existing queue
 * processor then sends and retries it like any other notification.
 *
 * "At most once" is enforced by the unique (specialist_id, type) index, not
 * just by the `alreadySent` filter: `skipDuplicates` makes an overlapping
 * cron run a no-op instead of a double email.
 */
export async function enqueueTrialEmails(now: Date = new Date()): Promise<Record<TrialEmailType, number>> {
  const counts: Record<TrialEmailType, number> = { trial_ending_soon: 0, trial_ended: 0 };

  const candidates = await prisma.specialist.findMany({
    where: {
      trialEndsAt: {
        gte: new Date(now.getTime() - TRIAL_ENDED_LOOKBACK_DAYS * DAY_MS),
        lte: new Date(now.getTime() + TRIAL_ENDING_SOON_DAYS * DAY_MS),
      },
      emailVerifiedAt: { not: null },
      deletedAt: null,
      OR: [{ subscriptionActiveUntil: null }, { subscriptionActiveUntil: { lte: now } }],
    },
    select: {
      id: true,
      email: true,
      trialEndsAt: true,
      subscriptionActiveUntil: true,
      emailVerifiedAt: true,
      deletedAt: true,
      notifications: { where: { type: { in: [...TRIAL_EMAIL_TYPES] } }, select: { type: true } },
    },
  });

  const rows: { specialistId: string; type: TrialEmailType; recipient: string }[] = [];
  for (const specialist of candidates) {
    const sent = new Set(specialist.notifications.map((n) => n.type));
    const type = getEligibleTrialEmail(specialist, now, sent);
    if (type) rows.push({ specialistId: specialist.id, type, recipient: specialist.email });
  }
  if (rows.length === 0) return counts;

  await prisma.notificationLog.createMany({
    data: rows.map((r) => ({ ...r, channel: "email" as const, scheduledFor: now })),
    skipDuplicates: true,
  });
  for (const r of rows) counts[r.type]++;
  return counts;
}
