"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { href: "/dashboard", key: "home" },
  { href: "/dashboard/appointments", key: "appointments" },
  { href: "/dashboard/clients", key: "clients" },
  { href: "/dashboard/profile", key: "profile" },
  { href: "/dashboard/portfolio", key: "portfolio" },
  { href: "/dashboard/working-hours", key: "workingHours" },
  { href: "/dashboard/blocked-time", key: "blockedTime" },
  { href: "/dashboard/services", key: "services" },
  { href: "/dashboard/reviews", key: "reviews" },
  { href: "/dashboard/analytics", key: "analytics" },
  { href: "/dashboard/plan", key: "plan" },
] as const;

const BADGE_DISPLAY_CAP = 9;

export function DashboardNav({ unviewedAppointmentsCount }: { unviewedAppointmentsCount: number }) {
  const t = useTranslations("Dashboard.nav");
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-brand-charcoal/10 px-6" aria-label={t("label")}>
      {TABS.map((tab) => {
        const isActive = tab.href === "/dashboard" ? pathname === tab.href : pathname.startsWith(tab.href);
        const badgeCount = tab.key === "appointments" ? unviewedAppointmentsCount : 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex items-center whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
              isActive
                ? "border-brand-gold text-brand-green"
                : "border-transparent text-brand-charcoal/60 hover:text-brand-charcoal"
            }`}
          >
            {t(tab.key)}
            {badgeCount > 0 && (
              <span
                className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-gold px-1 text-[10px] font-semibold leading-none text-brand-charcoal"
                aria-label={t("unviewedBadgeLabel", { count: badgeCount })}
              >
                {badgeCount > BADGE_DISPLAY_CAP ? `${BADGE_DISPLAY_CAP}+` : badgeCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
