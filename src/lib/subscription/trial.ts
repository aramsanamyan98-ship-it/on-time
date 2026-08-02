import { prisma } from "@/lib/prisma";
import type { Specialist } from "@/generated/prisma/client";

// 02_PRD.md Section 14 (updated) / 08_Roadmap.md Phase 7 follow-up: flat
// 3-month trial replaces the old 30-day + booking-milestone model. Referral
// extensions are unchanged.
export const TRIAL_LENGTH_DAYS = 90;
export const REFERRAL_BLOCK_SIZE = 5;
export const REFERRAL_EXTENSION_DAYS = 7;
export const SUBSCRIPTION_PROMPT_BOOKING_THRESHOLD = 5;

const DAY_MS = 24 * 60 * 60 * 1000;
export const TRIAL_LENGTH_MS = TRIAL_LENGTH_DAYS * DAY_MS;

type TrialFields = Pick<Specialist, "plan" | "trialEndsAt">;

export function isTrialActive(specialist: TrialFields): boolean {
  return specialist.trialEndsAt !== null && specialist.trialEndsAt.getTime() > Date.now();
}

/**
 * Whether a specialist currently gets Starter-level access — either because
 * they've actually upgraded, or because their trial (base 3 months plus any
 * referral extensions) hasn't run out yet. `plan` itself is never written to
 * "basic" on trial expiry (see prisma/schema.prisma header comment); this
 * is the one place that "drop" is expressed.
 */
export function hasFullAccess(specialist: TrialFields): boolean {
  return specialist.plan !== "basic" || isTrialActive(specialist);
}

/** Whole days remaining, rounded up so "a few hours left" still reads as 1, not 0. */
export function trialDaysRemaining(specialist: TrialFields): number {
  if (!isTrialActive(specialist)) return 0;
  return Math.ceil((specialist.trialEndsAt!.getTime() - Date.now()) / DAY_MS);
}

/**
 * "Bookings" for milestone/prompt purposes excludes cancellations, the same
 * convention the dashboard home page already uses for "today's
 * appointments" (see src/app/[locale]/dashboard/page.tsx).
 */
export async function countBookings(specialistId: string): Promise<number> {
  return prisma.appointment.count({ where: { specialistId, status: { not: "cancelled" } } });
}

/**
 * +7-day trial extension per block of 5 successful referrals
 * (07_Business_Rules.md), repeatable — `referralExtensionsGranted` tracks
 * how many 7-day blocks have already been granted so re-evaluating after
 * every new referral only ever grants the newly-crossed blocks, never
 * re-grants past ones.
 */
export async function applyReferralExtensions(specialistId: string): Promise<void> {
  try {
    const specialist = await prisma.specialist.findUnique({ where: { id: specialistId } });
    if (!specialist) return;

    const successfulReferrals = await prisma.referral.count({
      where: { specialistId, status: "booked_first_appointment" },
    });
    const eligibleBlocks = Math.floor(successfulReferrals / REFERRAL_BLOCK_SIZE);
    const newBlocks = eligibleBlocks - specialist.referralExtensionsGranted;
    if (newBlocks <= 0) return;

    const base = isTrialActive(specialist) ? specialist.trialEndsAt! : new Date();
    await prisma.specialist.update({
      where: { id: specialistId },
      data: {
        trialEndsAt: new Date(base.getTime() + newBlocks * REFERRAL_EXTENSION_DAYS * DAY_MS),
        referralExtensionsGranted: { increment: newBlocks },
      },
    });
  } catch (err) {
    console.error("[subscription] failed to apply referral extensions:", err);
  }
}
