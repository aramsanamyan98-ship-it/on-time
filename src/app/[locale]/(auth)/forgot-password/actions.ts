"use server";

import { getLocale } from "next-intl/server";
import { requestPasswordReset } from "@/lib/auth/forgot-password";
import { validateEmail } from "@/lib/auth/validation";
import type { AppLocale } from "@/i18n/routing";
import type { FieldErrors } from "@/lib/auth/errors";

export type ForgotPasswordState = {
  fieldErrors?: FieldErrors;
  success?: boolean;
};

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "");

  const fieldErrors = validateEmail(email);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const locale = (await getLocale()) as AppLocale;
  await requestPasswordReset(email, locale);
  return { success: true };
}
