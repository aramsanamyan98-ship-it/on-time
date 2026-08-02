"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { registerAction, type RegisterState } from "./actions";
import { CardHeading } from "@/components/Heading";

const initialState: RegisterState = {};

export function RegisterForm() {
  const t = useTranslations("Auth.register");
  const tErrors = useTranslations("Auth.errors");
  const [state, formAction, isPending] = useActionState(registerAction, initialState);

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

      {state.formError && (
        <p role="alert" className="text-sm text-red-700">
          {tErrors(state.formError)}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary mt-2"
      >
        {isPending ? t("submitting") : t("submit")}
      </button>

      <p className="text-sm text-brand-charcoal/70">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-green underline">
          {t("signInLink")}
        </Link>
      </p>
    </form>
  );
}
