import { prisma } from "@/lib/prisma";
import { isTrialActive, trialDaysRemaining, countBookings, SUBSCRIPTION_PROMPT_BOOKING_THRESHOLD } from "@/lib/subscription/trial";
import { countPortfolioPhotos, BASIC_PLAN_PORTFOLIO_PHOTO_LIMIT } from "@/lib/subscription/plan-limits";
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
  /** Only meaningful once actually on Basic (past trial, not upgraded) — null otherwise. */
  basicPortfolioPhotosUsed: number | null;
  basicPortfolioPhotoLimit: number;
  /** 02_PRD.md Section 14 (updated): every plan value, including "basic", now has a real monthly price — there's no free tier once the trial ends. */
  currentPlanPriceAmd: number;
};

/**
 * Everything the dashboard Plan page (08_Roadmap.md Phase 7) and the
 * 5-bookings subscription-prompt banner need in one place, so both read
 * the same numbers rather than recomputing them slightly differently.
 */
export async function getPlanStatus(specialist: Specialist): Promise<PlanStatus> {
  const trialActive = isTrialActive(specialist);
  const [bookingCount, successfulReferralCount, basicPortfolioPhotosUsed] = await Promise.all([
    countBookings(specialist.id),
    prisma.referral.count({ where: { specialistId: specialist.id, status: "booked_first_appointment" } }),
    specialist.plan === "basic" && !trialActive ? countPortfolioPhotos(specialist.id) : Promise.resolve(null),
  ]);

  return {
    plan: specialist.plan,
    isTrialActive: trialActive,
    trialEndsAt: specialist.trialEndsAt,
    trialDaysRemaining: trialDaysRemaining(specialist),
    bookingCount,
    successfulReferralCount,
    // Only nudge specialists who haven't upgraded yet — Starter/Pro
    // specialists have already made the decision this prompt is for. Never
    // during an active trial (02_PRD.md Section 14, updated): trialing
    // specialists already have full Starter-level access and shouldn't see
    // an upgrade paywall/prompt before the trial itself has run out.
    showSubscriptionPrompt:
      specialist.plan === "basic" &&
      !trialActive &&
      !specialist.subscriptionPromptDismissedAt &&
      bookingCount >= SUBSCRIPTION_PROMPT_BOOKING_THRESHOLD,
    basicPortfolioPhotosUsed,
    basicPortfolioPhotoLimit: BASIC_PLAN_PORTFOLIO_PHOTO_LIMIT,
    currentPlanPriceAmd: PLAN_PRICE_AMD[specialist.plan],
  };
}
