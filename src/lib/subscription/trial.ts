import type { Specialist } from "@/generated/prisma/client";

// 02_PRD.md Section 14 (final pricing model): flat 3-month trial, no
// extensions of any kind (the old referral-based +7-days-per-5-referrals
// mechanic is removed).
export const TRIAL_LENGTH_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;
export const TRIAL_LENGTH_MS = TRIAL_LENGTH_DAYS * DAY_MS;

type AccessFields = Pick<Specialist, "trialEndsAt" | "subscriptionActiveUntil">;

export function isTrialActive(specialist: Pick<Specialist, "trialEndsAt">): boolean {
  return specialist.trialEndsAt !== null && specialist.trialEndsAt.getTime() > Date.now();
}

/**
 * Whether a specialist currently has a paid subscription in effect
 * (`subscriptionActiveUntil` is only ever written by a manual/admin action
 * once payment is arranged off-platform — see prisma/schema.prisma).
 */
export function isSubscriptionActive(specialist: Pick<Specialist, "subscriptionActiveUntil">): boolean {
  return specialist.subscriptionActiveUntil !== null && specialist.subscriptionActiveUntil.getTime() > Date.now();
}

/**
 * The single access check for the whole app (02_PRD.md Section 14): full
 * dashboard + booking-management features if either the trial or a paid
 * subscription (of any commitment length) is currently active, nothing
 * otherwise. There is no per-feature or per-commitment-length distinction
 * anymore — access is binary.
 */
export function hasActiveAccess(specialist: AccessFields): boolean {
  return isTrialActive(specialist) || isSubscriptionActive(specialist);
}

/** Whole days remaining, rounded up so "a few hours left" still reads as 1, not 0. */
export function trialDaysRemaining(specialist: Pick<Specialist, "trialEndsAt">): number {
  if (!isTrialActive(specialist)) return 0;
  return Math.ceil((specialist.trialEndsAt!.getTime() - Date.now()) / DAY_MS);
}
