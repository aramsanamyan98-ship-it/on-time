"use server";

import { getLocale } from "next-intl/server";
import { resendVerificationEmail } from "@/lib/auth/register";
import type { AppLocale } from "@/i18n/routing";

export type ResendState = {
  sent?: boolean;
};

export async function resendVerificationAction(
  _prevState: ResendState,
  formData: FormData,
): Promise<ResendState> {
  const email = String(formData.get("email") ?? "");
  const locale = (await getLocale()) as AppLocale;
  await resendVerificationEmail(email, locale);
  return { sent: true };
}
