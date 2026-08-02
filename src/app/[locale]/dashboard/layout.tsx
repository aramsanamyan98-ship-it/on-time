import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { getPlanStatus } from "@/lib/subscription/status";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "./LogoutButton";
import { DashboardNav } from "./DashboardNav";
import { SubscriptionPromptBanner } from "./SubscriptionPromptBanner";

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

  const specialist = await requireSpecialist(locale as AppLocale);
  const planStatus = await getPlanStatus(specialist);

  const t = await getTranslations("Dashboard");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold tracking-tight text-brand-green">{t("title")}</span>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>
      <SubscriptionPromptBanner initiallyVisible={planStatus.showSubscriptionPrompt} />
      <DashboardNav />
      <main className="flex flex-1 flex-col px-6 py-8">{children}</main>
    </div>
  );
}
