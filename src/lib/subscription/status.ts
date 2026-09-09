import { isTrialActive, isSubscriptionActive, hasActiveAccess, trialDaysRemaining } from "@/lib/subscription/trial";
import type { Specialist } from "@/generated/prisma/client";

export type PlanStatus = {
  isTrialActive: boolean;
  trialEndsAt: Date | null;
  trialDaysRemaining: number;
  isSubscriptionActive: boolean;
  subscriptionActiveUntil: Date | null;
  subscriptionCommitmentMonths: Specialist["subscriptionCommitmentMonths"];
  /** 02_PRD.md Section 14: true while either the trial or a paid subscription is in effect — the single access gate for the whole dashboard. */
  hasActiveAccess: boolean;
};

/** Everything the dashboard Plan page and the access gate in dashboard/layout.tsx need in one place. */
export function getPlanStatus(specialist: Specialist): PlanStatus {
  return {
    isTrialActive: isTrialActive(specialist),
    trialEndsAt: specialist.trialEndsAt,
    trialDaysRemaining: trialDaysRemaining(specialist),
    isSubscriptionActive: isSubscriptionActive(specialist),
    subscriptionActiveUntil: specialist.subscriptionActiveUntil,
    subscriptionCommitmentMonths: specialist.subscriptionCommitmentMonths,
    hasActiveAccess: hasActiveAccess(specialist),
  };
}
