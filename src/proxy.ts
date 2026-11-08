import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE_NAME, routing, type AppLocale } from "@/i18n/routing";
import { detectBookingLocale, resolveBookingRoute } from "@/lib/booking/short-url";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session-token";

const intlMiddleware = createIntlMiddleware(routing);

function stripLocale(pathname: string): { locale: string | null; rest: string } {
  const segments = pathname.split("/").filter(Boolean);
  const [first, ...remainder] = segments;
  if ((routing.locales as readonly string[]).includes(first)) {
    return { locale: first, rest: `/${remainder.join("/")}` };
  }
  return { locale: null, rest: pathname };
}

const LOCALE_COOKIE_OPTIONS = { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 } as const;

// Short public booking URLs (book.on-time.am/anna, /anna/new). Old
// /{locale}/book/{slug} URLs get a permanent 301 to the short form; the short
// form is served by rewriting to the internal /{locale}/book/{slug} route with
// the language picked from ?lang=, the saved cookie or Accept-Language.
function handleBookingRoute(request: NextRequest): NextResponse | null {
  const route = resolveBookingRoute(request.nextUrl.pathname);
  if (!route) return null;

  if (route.kind === "redirect") {
    const url = request.nextUrl.clone();
    url.pathname = route.to;
    const response = NextResponse.redirect(url, 301);
    // Keep the language the old link was in, since the new URL no longer carries it.
    if (route.locale) response.cookies.set(LOCALE_COOKIE_NAME, route.locale, LOCALE_COOKIE_OPTIONS);
    return response;
  }

  const langParam = request.nextUrl.searchParams.get("lang");
  const locale: AppLocale = detectBookingLocale({
    langParam,
    cookie: request.cookies.get(LOCALE_COOKIE_NAME)?.value,
    acceptLanguage: request.headers.get("accept-language"),
  });

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/book/${route.slug}${route.sub}`;
  // next-intl reads the request language from this header (normally set by its own middleware).
  const headers = new Headers(request.headers);
  headers.set("X-NEXT-INTL-LOCALE", locale);

  const response = NextResponse.rewrite(url, { request: { headers } });
  if (langParam === locale) response.cookies.set(LOCALE_COOKIE_NAME, locale, LOCALE_COOKIE_OPTIONS);
  return response;
}

export default async function middleware(request: NextRequest) {
  const bookingResponse = handleBookingRoute(request);
  if (bookingResponse) return bookingResponse;

  const { rest } = stripLocale(request.nextUrl.pathname);

  if (rest === "/dashboard" || rest.startsWith("/dashboard/")) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      const { locale } = stripLocale(request.nextUrl.pathname);
      const redirectUrl = new URL(`/${locale ?? routing.defaultLocale}/login`, request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
