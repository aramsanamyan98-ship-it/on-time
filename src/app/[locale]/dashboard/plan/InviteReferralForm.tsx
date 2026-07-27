"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { inviteReferralAction, type InviteReferralState } from "./actions";

const initialState: InviteReferralState = {};

export function InviteReferralForm() {
  const t = useTranslations("Subscription");
  const tErrors = useTranslations("Dashboard.errors");
  const [state, formAction, isPending] = useActionState(inviteReferralAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate>
      <label htmlFor="referralEmail" className="text-sm font-medium text-brand-charcoal">
        {t("inviteTitle")}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="referralEmail"
          name="email"
          type="email"
          placeholder={t("inviteEmailLabel")}
          required
          className="flex-1 rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? t("inviteSending") : t("inviteSend")}
        </button>
      </div>
      {state.fieldErrors?.email && (
        <p role="alert" className="text-sm text-red-700">
          {tErrors(state.fieldErrors.email)}
        </p>
      )}
      {state.formError && !state.fieldErrors?.email && (
        <p role="alert" className="text-sm text-red-700">
          {tErrors(state.formError)}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-brand-green">
          {t("inviteSent")}
        </p>
      )}
    </form>
  );
}
