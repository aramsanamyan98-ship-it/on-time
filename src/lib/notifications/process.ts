import "server-only";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications/send";

// 07_Business_Rules.md / 10_Risks.md: failed sends must be retried, not
// silently dropped, but also not retried forever. Five attempts spread
// across cron ticks (see vercel.json) is a reasonable v1 default for a
// single-specialist-scale notification volume.
export const MAX_NOTIFICATION_ATTEMPTS = 5;

// Bounds how much work one processing pass takes on — the cron route (see
// src/app/api/notifications/process/route.ts) runs frequently enough that
// a backlog drains within a few ticks rather than needing to process
// everything in one request.
const BATCH_LIMIT = 50;

export type ProcessResult = { processed: number; sent: number; failed: number };

/**
 * Finds every notification that's due (queued, or previously failed with
 * retries remaining) and attempts to send it. Each row is handled
 * independently — one bad row/mailer error never stops the rest of the
 * batch, and never throws back into the caller (02_PRD.md Section 9: a
 * failed notification must never affect the booking or block other sends).
 *
 * Multiple invocations can legitimately overlap — a single request that
 * creates several appointments schedules one `after()` callback per
 * appointment (see src/lib/notifications/queue.ts), and cron ticks can
 * overlap a slow-running previous one — so each row is claimed with an
 * optimistic-concurrency `updateMany` (conditioned on the `attempts` count
 * this read saw) before it's sent. If the claim's affected-row count is 0,
 * another concurrent call already claimed it, and this call skips it
 * rather than sending the same email twice.
 */
export async function processQueuedNotifications(): Promise<ProcessResult> {
  const now = new Date();
  const due = await prisma.notificationLog.findMany({
    where: {
      scheduledFor: { lte: now },
      OR: [{ status: "queued" }, { status: "failed", attempts: { lt: MAX_NOTIFICATION_ATTEMPTS } }],
    },
    include: { appointment: { include: { specialist: true, service: true } } },
    orderBy: { scheduledFor: "asc" },
    take: BATCH_LIMIT,
  });

  let sent = 0;
  let failed = 0;

  for (const row of due) {
    const claim = await prisma.notificationLog.updateMany({
      where: { id: row.id, status: row.status, attempts: row.attempts },
      data: { attempts: { increment: 1 }, attemptedAt: now },
    });
    if (claim.count === 0) continue; // lost the race to a concurrent invocation

    try {
      await sendNotification(row, row.appointment);
      await prisma.notificationLog.update({
        where: { id: row.id },
        data: { status: "sent", errorMessage: null },
      });
      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed++;
      try {
        await prisma.notificationLog.update({
          where: { id: row.id },
          data: { status: "failed", errorMessage: message.slice(0, 500) },
        });
      } catch (logErr) {
        // Even the failure log write failed (e.g. DB hiccup) — swallow it
        // rather than let one row's bookkeeping error abort the batch.
        console.error("[notifications] failed to record failed attempt:", logErr);
      }
    }
  }

  return { processed: due.length, sent, failed };
}
