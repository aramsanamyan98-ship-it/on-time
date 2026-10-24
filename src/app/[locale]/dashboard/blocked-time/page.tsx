import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { redirect } from "@/i18n/navigation";

// Blocked time now lives on the Working hours page (as its own section).
// This keeps the old URL (bookmarks, anything that still links here) working.
export default async function BlockedTimeRedirectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return redirect({ href: "/dashboard/working-hours#blocked-time", locale });
}
