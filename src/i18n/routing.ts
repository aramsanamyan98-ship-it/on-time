import { defineRouting } from "next-intl/routing";

/** Cookie remembering the visitor's language (set by next-intl and by the booking-page language switcher). */
export const LOCALE_COOKIE_NAME = "ontime_locale";

export const routing = defineRouting({
  // BCP-47 tags so browser Accept-Language auto-detection works correctly
  // (see src/lib/locale.ts for why this isn't ["am", "ru", "en"]).
  locales: ["hy", "ru", "en"],
  defaultLocale: "en",
  localePrefix: "always",
  localeCookie: {
    name: LOCALE_COOKIE_NAME,
  },
});

export type AppLocale = (typeof routing.locales)[number];
