import type { Language } from "@/generated/prisma/client";
import type { AppLocale } from "@/i18n/routing";

/**
 * The app's routing locales use real BCP-47 tags so that browser-locale
 * auto-detection (02_PRD.md Section 2) actually works — a browser reports
 * Armenian as "hy", never "am" ("am" is Amharic in BCP-47). 05_Database.md
 * separately defines the `language_preference` enum as am/ru/en (an
 * internal storage key, not a wire-format locale tag), so we keep that
 * enum as-is and translate between the two at the edges.
 */
export const routingLocaleToLanguage: Record<AppLocale, Language> = {
  hy: "am",
  ru: "ru",
  en: "en",
};

export const languageToRoutingLocale: Record<Language, AppLocale> = {
  am: "hy",
  ru: "ru",
  en: "en",
};
