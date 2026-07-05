"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resetPasswordAction, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("Auth.resetPassword");
  const tErrors = useTranslations("Auth.errors");
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-brand-charcoal">{t("successTitle")}</h1>
        <p className="text-sm text-brand-charcoal/70">{t("successMessage")}</p>
        <Link href="/login" className="text-sm font-medium text-brand-green underline">
          {t("signInLink")}
        </Link>
      </div>
    );
  }

  if (state.formError === "invalidOrExpiredToken") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-brand-charcoal">{t("invalidTokenTitle")}</h1>
        <p className="text-sm text-brand-charcoal/70">{t("invalidTokenMessage")}</p>
        <Link href="/forgot-password" className="text-sm font-medium text-brand-green underline">
          {t("requestNewLink")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <h1 className="text-xl font-semibold text-brand-charcoal">{t("title")}</h1>
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
        className="mt-2 rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
