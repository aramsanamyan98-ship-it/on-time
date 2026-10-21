import type { NotificationType, Specialist } from "@/generated/prisma/client";

export const TRIAL_EMAIL_TYPES = ["trial_ending_soon", "trial_ended"] as const satisfies readonly NotificationType[];
export type TrialEmailType = (typeof TRIAL_EMAIL_TYPES)[number];

export function isTrialEmailType(type: NotificationType): type is TrialEmailType {
  return (TRIAL_EMAIL_TYPES as readonly string[]).includes(type);
}

/** How far ahead of `trialEndsAt` the "ending soon" email becomes eligible. */
export const TRIAL_ENDING_SOON_DAYS = 7;
/**
 * How long after `trialEndsAt` the "trial ended" email stays eligible.
 * Without a cap, the first cron run after this feature ships would email
 * every specialist whose trial lapsed months ago; a long-lapsed trial is
 * a win-back conversation, not a "your trial has ended" notice.
 */
export const TRIAL_ENDED_LOOKBACK_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TrialEmailCandidate = Pick<
  Specialist,
  "trialEndsAt" | "subscriptionActiveUntil" | "emailVerifiedAt" | "deletedAt"
>;

/**
 * Which trial email (if any) a specialist should receive right now. Pure —
 * the daily cron (src/lib/notifications/trial-queue.ts) feeds it candidates
 * and the set of trial email types already logged for that specialist.
 *
 * - `trial_ending_soon`: the trial is still running and ends within
 *   TRIAL_ENDING_SOON_DAYS. A window rather than an exact day, so a missed
 *   cron tick doesn't skip the email.
 * - `trial_ended`: `trialEndsAt` has passed, within the last
 *   TRIAL_ENDED_LOOKBACK_DAYS.
 * - Nobody with a paid subscription still in effect gets either, nor does
 *   an unverified or deleted account, nor a type already sent.
 */
export function getEligibleTrialEmail(
  specialist: TrialEmailCandidate,
  now: Date,
  alreadySent: ReadonlySet<NotificationType>,
): TrialEmailType | null {
  if (!specialist.trialEndsAt || !specialist.emailVerifiedAt || specialist.deletedAt) return null;
  if (specialist.subscriptionActiveUntil && specialist.subscriptionActiveUntil.getTime() > now.getTime()) return null;

  const msUntilEnd = specialist.trialEndsAt.getTime() - now.getTime();
  let type: TrialEmailType | null = null;
  if (msUntilEnd <= 0) {
    if (-msUntilEnd <= TRIAL_ENDED_LOOKBACK_DAYS * DAY_MS) type = "trial_ended";
  } else if (msUntilEnd <= TRIAL_ENDING_SOON_DAYS * DAY_MS) {
    type = "trial_ending_soon";
  }

  if (!type || alreadySent.has(type)) return null;
  return type;
}
