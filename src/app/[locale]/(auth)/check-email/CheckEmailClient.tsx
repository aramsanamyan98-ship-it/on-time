"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { resendVerificationAction, type ResendState } from "./actions";
import { CardHeading } from "@/components/Heading";

const initialState: ResendState = {};

export function CheckEmailClient({ email }: { email: string }) {
  const t = useTranslations("Auth.checkEmail");
  const [state, formAction, isPending] = useActionState(resendVerificationAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <CardHeading>{t("title")}</CardHeading>
      <p className="body-text text-sm">{t("message", { email })}</p>
      <input type="hidden" name="email" value={email} />

      {state.sent ? (
        <p className="text-sm text-brand-green">{t("resendSent")}</p>
      ) : (
        <p className="body-text text-sm">
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
