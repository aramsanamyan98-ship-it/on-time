"use server";

import { getLocale } from "next-intl/server";
import { clearSessionCookie } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  const locale = (await getLocale()) as AppLocale;
  return redirect({ href: "/login", locale });
}
