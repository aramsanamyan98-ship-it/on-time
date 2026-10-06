import type { FieldErrors } from "@/lib/dashboard/errors";
import type { LoyaltyRuleType } from "@/generated/prisma/client";

const REWARD_TEXT_MAX_LENGTH = 200;
// A threshold of 1 would mean "every visit is free"/"free from visit one",
// which isn't a loyalty reward — require at least a second visit to earn one.
const MIN_THRESHOLD = 2;

export const LOYALTY_RULE_TYPES: LoyaltyRuleType[] = ["everyNthFree", "percentOffAfterN"];

export type LoyaltyFields = "ruleType" | "threshold" | "rewardText";

export type LoyaltyFormInput = { ruleType: string; threshold: string; rewardText: string };

export function validateLoyaltyFields(input: LoyaltyFormInput): FieldErrors<LoyaltyFields> {
  const errors: FieldErrors<LoyaltyFields> = {};

  if (!LOYALTY_RULE_TYPES.includes(input.ruleType as LoyaltyRuleType)) {
    errors.ruleType = "generic";
  }

  const threshold = Number(input.threshold);
  if (!input.threshold.trim() || !Number.isInteger(threshold) || threshold < MIN_THRESHOLD) {
    errors.threshold = "thresholdInvalid";
  }

  const rewardText = input.rewardText.trim();
  if (!rewardText) errors.rewardText = "rewardTextRequired";
  else if (rewardText.length > REWARD_TEXT_MAX_LENGTH) errors.rewardText = "rewardTextTooLong";

  return errors;
}
