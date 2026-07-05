"use client";

import { useLocale, useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const t = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{t("languageSwitcher.label")}</span>
      <select
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value as (typeof routing.locales)[number];
          router.replace(pathname, { locale: nextLocale });
        }}
        className="rounded-md border border-brand-charcoal/20 bg-transparent px-2 py-1 text-sm text-brand-charcoal"
        aria-label={t("languageSwitcher.label")}
      >
        {routing.locales.map((code) => (
          <option key={code} value={code}>
            {t(`localeNames.${code}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
