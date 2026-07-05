import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
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

export default async function middleware(request: NextRequest) {
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
