"use server";

import { getLocale } from "next-intl/server";
import { registerSpecialist } from "@/lib/auth/register";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { FieldErrors, AuthErrorCode } from "@/lib/auth/errors";

export type RegisterState = {
  fieldErrors?: FieldErrors;
  formError?: AuthErrorCode;
};

// Reads the locale ambiently via getLocale() rather than taking it as a
// bound argument — binding extra args onto a server action reference used
// with useActionState triggers a hang on the non-redirect (error) path in
// this Next.js version (reproduced in isolation; not a redirect/Prisma/
// bcrypt issue). Every action in this app follows this pattern for that
// reason.
export async function registerAction(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const locale = (await getLocale()) as AppLocale;
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const result = await registerSpecialist(email, password, confirmPassword, locale);
  if (!result.ok) {
    return { fieldErrors: result.fieldErrors, formError: result.formError };
  }

  return redirect({ href: `/check-email?email=${encodeURIComponent(result.data.email)}`, locale });
}
