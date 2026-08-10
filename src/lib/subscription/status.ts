import { prisma } from "@/lib/prisma";
import { isTrialActive, trialDaysRemaining, countBookings, SUBSCRIPTION_PROMPT_BOOKING_THRESHOLD } from "@/lib/subscription/trial";
import { PLAN_PRICE_AMD } from "@/lib/subscription/pricing";
import type { Specialist } from "@/generated/prisma/client";

export type PlanStatus = {
  plan: Specialist["plan"];
  isTrialActive: boolean;
  trialEndsAt: Date | null;
  trialDaysRemaining: number;
  bookingCount: number;
  successfulReferralCount: number;
  showSubscriptionPrompt: boolean;
  /** 02_PRD.md Section 14: every plan value has a real monthly price — there's no free tier once the trial ends. */
  currentPlanPriceAmd: number;
};

/**
 * Everything the dashboard Plan page (08_Roadmap.md Phase 7) and the
 * 5-bookings subscription-prompt banner need in one place, so both read
 * the same numbers rather than recomputing them slightly differently.
 */
export async function getPlanStatus(specialist: Specialist): Promise<PlanStatus> {
  const trialActive = isTrialActive(specialist);
  const [bookingCount, successfulReferralCount] = await Promise.all([
    countBookings(specialist.id),
    prisma.referral.count({ where: { specialistId: specialist.id, status: "booked_first_appointment" } }),
  ]);

  return {
    plan: specialist.plan,
    isTrialActive: trialActive,
    trialEndsAt: specialist.trialEndsAt,
    trialDaysRemaining: trialDaysRemaining(specialist),
    bookingCount,
    successfulReferralCount,
    // Nudges Starter specialists (the baseline paid plan) toward Pro once
    // they've received a handful of bookings — Pro specialists have
    // already made that call, and trialing specialists already have full
    // Pro-level access, so neither needs the nudge (02_PRD.md Section 14).
    showSubscriptionPrompt:
      specialist.plan === "starter" &&
      !trialActive &&
      !specialist.subscriptionPromptDismissedAt &&
      bookingCount >= SUBSCRIPTION_PROMPT_BOOKING_THRESHOLD,
    currentPlanPriceAmd: PLAN_PRICE_AMD[specialist.plan],
  };
}
