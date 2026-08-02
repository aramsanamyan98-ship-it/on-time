"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resetPasswordAction, type ResetPasswordState } from "./actions";
import { CardHeading } from "@/components/Heading";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("Auth.resetPassword");
  const tErrors = useTranslations("Auth.errors");
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <CardHeading>{t("successTitle")}</CardHeading>
        <p className="body-text text-sm">{t("successMessage")}</p>
        <Link href="/login" className="text-sm font-medium text-brand-green underline">
          {t("signInLink")}
        </Link>
      </div>
    );
  }

  if (state.formError === "invalidOrExpiredToken") {
    return (
      <div className="flex flex-col gap-4">
        <CardHeading>{t("invalidTokenTitle")}</CardHeading>
        <p className="body-text text-sm">{t("invalidTokenMessage")}</p>
        <Link href="/forgot-password" className="text-sm font-medium text-brand-green underline">
          {t("requestNewLink")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <CardHeading>{t("title")}</CardHeading>
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-brand-charcoal">
          {t("passwordLabel")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
        {state.fieldErrors?.password && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.password)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-brand-charcoal">
          {t("confirmPasswordLabel")}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
        {state.fieldErrors?.confirmPassword && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.confirmPassword)}
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
    </form>
  );
}
