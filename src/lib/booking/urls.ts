import type { AppLocale } from "@/i18n/routing";

/**
 * Base URL that public booking links are built on, no trailing slash.
 * BOOKING_BASE_URL wins; otherwise the app's own APP_URL (so local dev and
 * preview deployments produce working links); otherwise production.
 * Server-only: the env vars are not exposed to the browser, so pass the result
 * down as a prop.
 */
export function getBookingBaseUrl(): string {
  const raw = process.env.BOOKING_BASE_URL || process.env.APP_URL || "https://book.on-time.am";
  return raw.replace(/\/+$/, "");
}

/** "https://book.on-time.am" -> "book.on-time.am" (for display next to the slug field). */
export function hostFromBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

/**
 * Public booking URL: `{base}/{slug}` or `{base}/{slug}/new`. `lang` is only
 * for links whose recipient has a known language (emails, Stories); plain
 * share links leave it out and let the visitor's browser decide.
 */
export function buildBookingUrl(
  baseUrl: string,
  slug: string,
  options: { page?: "new"; query?: Record<string, string>; lang?: AppLocale } = {},
): string {
  const query = new URLSearchParams(options.query);
  if (options.lang) query.set("lang", options.lang);
  const qs = query.toString();
  return `${baseUrl}/${slug}${options.page ? `/${options.page}` : ""}${qs ? `?${qs}` : ""}`;
}
