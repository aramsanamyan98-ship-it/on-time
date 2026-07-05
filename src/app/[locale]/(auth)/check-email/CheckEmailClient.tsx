"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { resendVerificationAction, type ResendState } from "./actions";

const initialState: ResendState = {};

export function CheckEmailClient({ email }: { email: string }) {
  const t = useTranslations("Auth.checkEmail");
  const [state, formAction, isPending] = useActionState(resendVerificationAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-brand-charcoal">{t("title")}</h1>
      <p className="text-sm text-brand-charcoal/70">{t("message", { email })}</p>
      <input type="hidden" name="email" value={email} />

      {state.sent ? (
        <p className="text-sm text-brand-green">{t("resendSent")}</p>
      ) : (
        <p className="text-sm text-brand-charcoal/70">
          {t("resendPrompt")}{" "}
          <button
            type="submit"
            disabled={isPending}
            className="font-medium text-brand-green underline disabled:opacity-60"
          >
            {t("resendLink")}
          </button>
        </p>
      )}
    </form>
  );
}
