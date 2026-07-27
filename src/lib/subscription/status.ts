import { prisma } from "@/lib/prisma";
import {
  isTrialActive,
  trialDaysRemaining,
  countBookings,
  BOOKING_MILESTONE_COUNT,
  SUBSCRIPTION_PROMPT_BOOKING_THRESHOLD,
} from "@/lib/subscription/trial";
import { countBookingsThisMonth, BASIC_PLAN_MONTHLY_BOOKING_LIMIT } from "@/lib/subscription/plan-limits";
import type { Specialist } from "@/generated/prisma/client";

export type PlanStatus = {
  plan: Specialist["plan"];
  isTrialActive: boolean;
  trialEndsAt: Date | null;
  trialDaysRemaining: number;
  bookingCount: number;
  bookingMilestoneReached: boolean;
  successfulReferralCount: number;
  showSubscriptionPrompt: boolean;
  /** Only meaningful once actually on Basic (past trial, not upgraded) — null otherwise. */
  basicMonthlyBookingsUsed: number | null;
  basicMonthlyBookingLimit: number;
};

/**
 * Everything the dashboard Plan page (08_Roadmap.md Phase 7) and the
 * 5-bookings subscription-prompt banner need in one place, so both read
 * the same numbers rather than recomputing them slightly differently.
 */
export async function getPlanStatus(specialist: Specialist): Promise<PlanStatus> {
  const trialActive = isTrialActive(specialist);
  const [bookingCount, successfulReferralCount, basicMonthlyBookingsUsed] = await Promise.all([
    countBookings(specialist.id),
    prisma.referral.count({ where: { specialistId: specialist.id, status: "booked_first_appointment" } }),
    specialist.plan === "basic" && !trialActive ? countBookingsThisMonth(specialist) : Promise.resolve(null),
  ]);

  return {
    plan: specialist.plan,
    isTrialActive: trialActive,
    trialEndsAt: specialist.trialEndsAt,
    trialDaysRemaining: trialDaysRemaining(specialist),
    bookingCount,
    bookingMilestoneReached: bookingCount >= BOOKING_MILESTONE_COUNT || !!specialist.bookingMilestoneExtendedAt,
    successfulReferralCount,
    // Only nudge specialists who haven't upgraded yet — Starter/Pro
    // specialists have already made the decision this prompt is for.
    showSubscriptionPrompt:
      specialist.plan === "basic" &&
      !specialist.subscriptionPromptDismissedAt &&
      bookingCount >= SUBSCRIPTION_PROMPT_BOOKING_THRESHOLD,
    basicMonthlyBookingsUsed,
    basicMonthlyBookingLimit: BASIC_PLAN_MONTHLY_BOOKING_LIMIT,
  };
}
