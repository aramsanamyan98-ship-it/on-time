"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resendVerificationAction, type ResendState } from "../check-email/actions";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};
const initialResendState: ResendState = {};

function ResendVerification({ email }: { email: string }) {
  const t = useTranslations("Auth.checkEmail");
  const [state, formAction, isPending] = useActionState(resendVerificationAction, initialResendState);

  if (state.sent) {
    return <p className="text-sm text-brand-green">{t("resendSent")}</p>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="email" value={email} />
      <button
        type="submit"
        disabled={isPending}
        className="text-sm font-medium text-brand-green underline disabled:opacity-60"
      >
        {t("resendLink")}
      </button>
    </form>
  );
}

export function LoginForm() {
  const t = useTranslations("Auth.login");
  const tErrors = useTranslations("Auth.errors");
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <div>
          <h1 className="text-xl font-semibold text-brand-charcoal">{t("title")}</h1>
          <p className="mt-1 text-sm text-brand-charcoal/70">{t("subtitle")}</p>
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
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-brand-charcoal">
              {t("passwordLabel")}
            </label>
            <Link href="/forgot-password" className="text-sm text-brand-green underline">
              {t("forgotPasswordLink")}
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
          />
          {state.fieldErrors?.password && (
            <p role="alert" className="text-sm text-red-700">
              {tErrors(state.fieldErrors.password)}
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
          className="mt-2 rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? t("submitting") : t("submit")}
        </button>

        <p className="text-sm text-brand-charcoal/70">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-brand-green underline">
            {t("registerLink")}
          </Link>
        </p>
      </form>

      {state.formError === "emailNotVerified" && state.email && (
        <ResendVerification email={state.email} />
      )}
    </div>
  );
}
