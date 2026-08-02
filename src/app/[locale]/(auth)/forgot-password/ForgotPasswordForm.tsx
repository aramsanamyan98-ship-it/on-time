"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { forgotPasswordAction, type ForgotPasswordState } from "./actions";
import { CardHeading } from "@/components/Heading";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgotPassword");
  const tErrors = useTranslations("Auth.errors");
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <CardHeading>{t("successTitle")}</CardHeading>
        <p className="body-text text-sm">{t("successMessage")}</p>
        <Link href="/login" className="text-sm font-medium text-brand-green underline">
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div>
        <CardHeading>{t("title")}</CardHeading>
        <p className="body-text mt-2 text-sm">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-brand-charcoal">
          {t("emailLabel")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
        {state.fieldErrors?.email && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.email)}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary mt-2"
      >
        {isPending ? t("submitting") : t("submit")}
      </button>

      <Link href="/login" className="text-sm text-brand-green underline">
        {t("backToLogin")}
      </Link>
    </form>
  );
}
