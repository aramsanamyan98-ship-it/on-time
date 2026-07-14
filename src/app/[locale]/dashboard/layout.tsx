import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "./LogoutButton";
import { DashboardNav } from "./DashboardNav";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  await requireSpecialist(locale as AppLocale);

  const t = await getTranslations("Dashboard");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold text-brand-green">{t("title")}</span>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>
      <DashboardNav />
      <main className="flex flex-1 flex-col px-6 py-8">{children}</main>
    </div>
  );
}
