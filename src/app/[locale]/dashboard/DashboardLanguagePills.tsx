"use client";

import { useLocale, useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

const SHORT_LABELS = { hy: "ՀԱՅ", ru: "РУС", en: "ENG" } as const;

/** hy / ru / en switcher for the dashboard chrome: `dark` on the green sidebar, `light` inside the phone "More" sheet. */
export function DashboardLanguagePills({ tone, className = "" }: { tone: "dark" | "light"; className?: string }) {
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label={tCommon("languageSwitcher.label")}
      className={`flex items-center rounded-[0.625rem] border p-0.5 ${
        tone === "dark" ? "border-brand-cream/25" : "border-brand-sand bg-white"
      } ${className}`}
    >
      {routing.locales.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-label={tCommon(`localeNames.${code}`)}
            aria-pressed={active}
            onClick={() => router.replace(pathname, { locale: code })}
            className={`min-h-10 flex-1 rounded-lg px-2 text-[0.8125rem] font-semibold transition ${
              tone === "dark"
                ? active
                  ? "bg-brand-cream text-brand-green"
                  : "text-brand-cream hover:bg-brand-cream/10"
                : active
                  ? "bg-brand-green text-brand-cream"
                  : "text-brand-charcoal hover:bg-brand-charcoal/5"
            }`}
          >
            {SHORT_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
