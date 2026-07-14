"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { href: "/dashboard", key: "home" },
  { href: "/dashboard/profile", key: "profile" },
  { href: "/dashboard/portfolio", key: "portfolio" },
  { href: "/dashboard/working-hours", key: "workingHours" },
  { href: "/dashboard/services", key: "services" },
] as const;

export function DashboardNav() {
  const t = useTranslations("Dashboard.nav");
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-brand-charcoal/10 px-6" aria-label={t("label")}>
      {TABS.map((tab) => {
        const isActive = tab.href === "/dashboard" ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
              isActive
                ? "border-brand-gold text-brand-green"
                : "border-transparent text-brand-charcoal/60 hover:text-brand-charcoal"
            }`}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
