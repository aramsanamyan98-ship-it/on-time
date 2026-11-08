import { routing, type AppLocale } from "@/i18n/routing";
import { isBookableSlug } from "@/lib/slug-rules";

/**
 * Pure routing logic for the short public booking URLs (`/anna`, `/anna/new`)
 * so it can be unit-tested; src/proxy.ts only applies the result.
 *
 * Public booking pages used to live at `/{locale}/book/{slug}[/new]`. They are
 * still served by those routes internally, but visitors only ever see the
 * short form: the proxy rewrites `/{slug}` to the internal route and 301s the
 * old URLs to the new ones.
 */

/** Language used on a booking page when the visitor expresses no preference. */
export const BOOKING_DEFAULT_LOCALE: AppLocale = "hy";

export type BookingRoute =
  | { kind: "redirect"; to: string; locale: AppLocale | null }
  | { kind: "rewrite"; slug: string; sub: "" | "/new" };

function asLocale(value: string | null | undefined): AppLocale | null {
  return value && (routing.locales as readonly string[]).includes(value) ? (value as AppLocale) : null;
}

/** Returns null for every path that is not a booking page (or an old booking URL), so the rest of the proxy handles it as before. */
export function resolveBookingRoute(pathname: string): BookingRoute | null {
  const segments = pathname.split("/").filter(Boolean);
  const prefix = asLocale(segments[0]);
  const rest = prefix ? segments.slice(1) : segments;

  // Old format: /{locale}/book/{slug}[/new] and /book/{slug}[/new].
  if (rest[0] === "book" && rest.length >= 2 && rest.length <= 3 && isBookableSlug(rest[1])) {
    if (rest.length === 2) return { kind: "redirect", to: `/${rest[1]}`, locale: prefix };
    if (rest[2] === "new") return { kind: "redirect", to: `/${rest[1]}/new`, locale: prefix };
    return null;
  }

  // New format: /{slug} and /{slug}/new (never under a language prefix).
  if (!prefix && (segments.length === 1 || (segments.length === 2 && segments[1] === "new"))) {
    if (isBookableSlug(segments[0])) {
      return { kind: "rewrite", slug: segments[0], sub: segments.length === 2 ? "/new" : "" };
    }
  }

  return null;
}

/** Picks the supported language with the highest q-weight from an Accept-Language header. */
export function pickFromAcceptLanguage(header: string | null | undefined): AppLocale | null {
  if (!header) return null;
  let best: { locale: AppLocale; q: number } | null = null;
  for (const part of header.split(",")) {
    const [tag, ...params] = part.trim().split(";");
    const locale = asLocale(tag.trim().toLowerCase().split("-")[0]);
    if (!locale) continue;
    const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    const q = qParam ? Number(qParam.slice(2)) : 1;
    if (Number.isNaN(q) || q <= 0) continue;
    if (!best || q > best.q) best = { locale, q };
  }
  return best?.locale ?? null;
}

/**
 * Language for a booking page: `?lang=` (links in emails and Stories), then
 * the saved language cookie, then the browser's Accept-Language, then Armenian.
 */
export function detectBookingLocale(input: {
  langParam?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  return (
    asLocale(input.langParam) ??
    asLocale(input.cookie) ??
    pickFromAcceptLanguage(input.acceptLanguage) ??
    BOOKING_DEFAULT_LOCALE
  );
}
