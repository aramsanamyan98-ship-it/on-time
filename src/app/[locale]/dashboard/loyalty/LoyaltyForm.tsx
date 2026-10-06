"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateLoyaltyProgramAction, type LoyaltyFormState } from "./actions";
import { LOYALTY_RULE_TYPES } from "@/lib/loyalty/validation";
import type { LoyaltyRuleType } from "@/generated/prisma/client";

const initialState: LoyaltyFormState = {};

export function LoyaltyForm({
  initialValues,
}: {
  initialValues: { enabled: boolean; ruleType: LoyaltyRuleType; threshold: number; rewardText: string };
}) {
  const t = useTranslations("Loyalty");
  const tErrors = useTranslations("Dashboard.errors");
  const [state, formAction, isPending] = useActionState(updateLoyaltyProgramAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <label className="flex items-center gap-2 text-sm font-medium text-brand-charcoal">
        <input type="checkbox" name="enabled" defaultChecked={initialValues.enabled} className="h-4 w-4" />
        {t("enabledLabel")}
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="ruleType" className="text-sm font-medium text-brand-charcoal">
          {t("ruleTypeLabel")}
        </label>
        <select
          id="ruleType"
          name="ruleType"
          defaultValue={initialValues.ruleType}
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        >
          {LOYALTY_RULE_TYPES.map((ruleType) => (
            <option key={ruleType} value={ruleType}>
              {t(`ruleTypeOptions.${ruleType}`)}
            </option>
          ))}
        </select>
        {state.fieldErrors?.ruleType && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.ruleType)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="threshold" className="text-sm font-medium text-brand-charcoal">
          {t("thresholdLabel")}
        </label>
        <input
          id="threshold"
          name="threshold"
          type="number"
          min={2}
          step={1}
          inputMode="numeric"
          defaultValue={initialValues.threshold}
          required
          className="w-32 rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
        <p className="body-text text-xs">{t("thresholdHint")}</p>
        {state.fieldErrors?.threshold && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.threshold)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="rewardText" className="text-sm font-medium text-brand-charcoal">
          {t("rewardTextLabel")}
        </label>
        <input
          id="rewardText"
          name="rewardText"
          type="text"
          maxLength={200}
          defaultValue={initialValues.rewardText}
          placeholder={t("rewardTextPlaceholder")}
          required
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
        {state.fieldErrors?.rewardText && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.rewardText)}
          </p>
        )}
      </div>

      {state.formError && (
        <p role="alert" className="text-sm text-red-700">
          {tErrors(state.formError)}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-brand-green">
          {t("saved")}
        </p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-fit">
        {isPending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
