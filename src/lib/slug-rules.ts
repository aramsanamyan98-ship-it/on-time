/**
 * Rules for specialist slugs, shared by slug validation (server actions) and
 * the proxy that routes `book.on-time.am/[slug]`. No imports on purpose: the
 * proxy runs on the edge and must stay free of Prisma and other heavy code.
 */

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 40;

// Lowercase letters/digits in hyphen-separated groups: no leading/trailing
// hyphen, no "--", nothing but ASCII — this is a URL path segment
// (book.on-time.am/[slug]), not a display string.
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Slugs live at the very top of the URL space (`/anna`), so anything that is
 * already a top-level path, or could plausibly become one, must never be
 * claimable: the proxy hands every other single-segment path to the booking
 * page. A test (slug-rules.test.ts) fails if a folder is added under
 * src/app/[locale] or public/ without being listed here.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // Language prefixes
  "hy",
  "ru",
  "en",
  // App pages and route groups
  "login",
  "register",
  "dashboard",
  "forgot-password",
  "reset-password",
  "verify-email",
  "check-email",
  "book",
  "booking",
  "new",
  "auth",
  "logout",
  "signin",
  "signup",
  // System and static paths
  "api",
  "_next",
  "_vercel",
  "icon",
  "apple-icon",
  "favicon",
  "robots",
  "sitemap",
  "manifest",
  "brand",
  "uploads",
  "static",
  "public",
  "assets",
  // Staff / brand / generic words that would look official or confusing
  "admin",
  "administrator",
  "root",
  "app",
  "www",
  "mail",
  "ftp",
  "specialist",
  "on-time",
  "ontime",
  "support",
  "help",
  "about",
  "pricing",
  "plan",
  "plans",
  "terms",
  "privacy",
  "contact",
  "settings",
  "profile",
  "account",
  "status",
  "blog",
  "docs",
  "home",
  "index",
  "null",
  "undefined",
]);

/** True when `segment` is a syntactically valid, non-reserved slug the proxy should treat as a booking page. */
export function isBookableSlug(segment: string): boolean {
  return (
    segment.length >= SLUG_MIN_LENGTH &&
    segment.length <= SLUG_MAX_LENGTH &&
    SLUG_RE.test(segment) &&
    !RESERVED_SLUGS.has(segment)
  );
}
