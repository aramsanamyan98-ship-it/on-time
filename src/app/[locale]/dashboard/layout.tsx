import type { Viewport } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { getPlanStatus } from "@/lib/subscription/status";
import { getUnviewedAppointmentEventsCount } from "@/lib/dashboard/appointments-badge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "./LogoutButton";
import { DashboardNav } from "./DashboardNav";
import { SubscribeToContinue } from "./SubscribeToContinue";

// viewport-fit=cover lets the phone bottom bar and top bar respect the device safe areas (notch / home indicator).
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

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
  const planStatus = getPlanStatus(specialist);

  const t = await getTranslations("Dashboard");

  // 02_PRD.md Section 14: with no active trial/subscription the whole
  // dashboard (nav + page) is replaced by the "subscribe to continue" screen.
  if (!planStatus.hasActiveAccess) {
    return (
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight text-brand-green">{t("title")}</span>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <LogoutButton />
          </div>
        </header>
        <SubscribeToContinue locale={locale} />
      </div>
    );
  }

  const unviewedAppointmentsCount = await getUnviewedAppointmentEventsCount(specialist);

  return (
    <div className="ot-dashboard flex flex-1 flex-col lg:flex-row">
      <DashboardNav
        barber={{ name: specialist.displayName, photoUrl: specialist.profilePhotoUrl, slug: specialist.slug }}
        unviewedAppointmentsCount={unviewedAppointmentsCount}
      />
      {/* Bottom padding clears the fixed phone tab bar (and the home-indicator safe area); the sidebar is fixed, so on lg its width is the left margin. */}
      <main className="flex min-w-0 flex-1 flex-col px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:ml-[264px] lg:px-10 lg:pb-10 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
