import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // BCP-47 tags so browser Accept-Language auto-detection works correctly
  // (see src/lib/locale.ts for why this isn't ["am", "ru", "en"]).
  locales: ["hy", "ru", "en"],
  defaultLocale: "en",
  localePrefix: "always",
  localeCookie: {
    name: "ontime_locale",
  },
});

export type AppLocale = (typeof routing.locales)[number];
