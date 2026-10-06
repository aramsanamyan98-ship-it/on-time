"use server";

import { getSession } from "@/lib/session";
import { updateLoyaltyProgram } from "@/lib/loyalty/update-loyalty";
import type { LoyaltyFields } from "@/lib/loyalty/validation";
import type { FieldErrors, DashboardErrorCode } from "@/lib/dashboard/errors";

export type LoyaltyFormState = {
  fieldErrors?: FieldErrors<LoyaltyFields>;
  formError?: DashboardErrorCode;
  success?: boolean;
};

export async function updateLoyaltyProgramAction(
  _prevState: LoyaltyFormState,
  formData: FormData,
): Promise<LoyaltyFormState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };

  const result = await updateLoyaltyProgram(session.specialistId, formData.get("enabled") === "on", {
    ruleType: String(formData.get("ruleType") ?? ""),
    threshold: String(formData.get("threshold") ?? ""),
    rewardText: String(formData.get("rewardText") ?? ""),
  });

  if (!result.ok) {
    return { fieldErrors: result.fieldErrors, formError: result.formError };
  }
  return { success: true };
}
