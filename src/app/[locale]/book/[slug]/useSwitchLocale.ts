"use client";

import { useLocale } from "next-intl";
import { usePathname as useRawPathname, useRouter as useNextRouter } from "next/navigation";
import { LOCALE_COOKIE_NAME, type AppLocale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Language switching that works on both URL shapes this page tree is served
 * under:
 * - short public URLs (`/anna`): the language is not in the URL, so save it in
 *   the language cookie (which the proxy reads) and re-render in place;
 * - language-prefixed URLs (`/hy/booking/<token>`): navigate to the same page
 *   under the other prefix, as before.
 */
export function useSwitchLocale() {
  const locale = useLocale();
  const i18nRouter = useRouter();
  const i18nPathname = usePathname();
  const rawPathname = useRawPathname();
  const nextRouter = useNextRouter();

  return (next: AppLocale) => {
    const prefixed = rawPathname === `/${locale}` || rawPathname.startsWith(`/${locale}/`);
    if (prefixed) {
      i18nRouter.replace(i18nPathname, { locale: next });
      return;
    }

    document.cookie = `${LOCALE_COOKIE_NAME}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    // A ?lang= from an email link would otherwise override the choice just made.
    const url = new URL(window.location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.delete("lang");
      nextRouter.replace(`${url.pathname}${url.search}`);
    }
    nextRouter.refresh();
  };
}
