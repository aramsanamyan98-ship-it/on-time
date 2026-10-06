import type { LoyaltyRuleType } from "@/generated/prisma/client";

export type LoyaltyProgress = {
  /** Which visit the booking being made right now would be (1-indexed). */
  visitNumber: number;
  /** Visits still needed, after this one, to reach the next reward. 0 means this booking itself earns it. */
  remaining: number;
};

/**
 * `everyNthFree` repeats every `threshold` visits (visit 1..threshold-1 count
 * down to the Nth, then the cycle restarts). `percentOffAfterN` is a single
 * one-time unlock at `threshold` visits — reaching it doesn't reset.
 */
export function computeLoyaltyProgress(
  ruleType: LoyaltyRuleType,
  threshold: number,
  visitNumber: number,
): LoyaltyProgress {
  if (ruleType === "everyNthFree") {
    const positionInCycle = ((visitNumber - 1) % threshold) + 1;
    return { visitNumber, remaining: threshold - positionInCycle };
  }
  return { visitNumber, remaining: Math.max(threshold - visitNumber, 0) };
}
