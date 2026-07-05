"use server";

import { getLocale } from "next-intl/server";
import { loginSpecialist } from "@/lib/auth/login";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { FieldErrors, AuthErrorCode } from "@/lib/auth/errors";

export type LoginState = {
  fieldErrors?: FieldErrors;
  formError?: AuthErrorCode;
  email?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await loginSpecialist(email, password);
  if (!result.ok) {
    return { fieldErrors: result.fieldErrors, formError: result.formError, email };
  }

  const locale = (await getLocale()) as AppLocale;
  return redirect({ href: "/dashboard", locale });
}
