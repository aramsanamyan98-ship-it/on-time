import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { CheckEmailClient } from "./CheckEmailClient";

export default async function CheckEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return notFound();
  setRequestLocale(locale);

  const { email } = await searchParams;
  if (!email) return redirect(`/${locale}/register`);

  return <CheckEmailClient email={email} />;
}
