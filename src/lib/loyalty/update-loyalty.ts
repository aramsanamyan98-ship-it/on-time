import { prisma } from "@/lib/prisma";
import { validateLoyaltyFields, type LoyaltyFormInput } from "@/lib/loyalty/validation";
import type { ActionResult } from "@/lib/dashboard/errors";
import type { LoyaltyProgram, LoyaltyRuleType } from "@/generated/prisma/client";

export async function updateLoyaltyProgram(
  specialistId: string,
  enabled: boolean,
  input: LoyaltyFormInput,
): Promise<ActionResult<LoyaltyProgram>> {
  const fieldErrors = validateLoyaltyFields(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const ruleType = input.ruleType as LoyaltyRuleType;
  const threshold = Number(input.threshold);
  const rewardText = input.rewardText.trim();

  const loyaltyProgram = await prisma.loyaltyProgram.upsert({
    where: { specialistId },
    create: { specialistId, enabled, ruleType, threshold, rewardText },
    update: { enabled, ruleType, threshold, rewardText },
  });

  return { ok: true, data: loyaltyProgram };
}
