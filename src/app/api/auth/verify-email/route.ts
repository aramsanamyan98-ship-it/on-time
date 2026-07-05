import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/auth/verify-email";
import { setSessionCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { languageToRoutingLocale } from "@/lib/locale";
import { routing } from "@/i18n/routing";

// Plain GET route (not a page under [locale]) because it needs to set the
// session cookie as a side effect before redirecting, which Next.js only
// allows in Route Handlers / Server Actions, not while rendering a page.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL(`/${routing.defaultLocale}/verify-email?status=invalid`, request.url),
    );
  }

  const result = await verifyEmailToken(token);
  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/${routing.defaultLocale}/verify-email?status=invalid`, request.url),
    );
  }

  const specialist = await prisma.specialist.findUnique({
    where: { id: result.data.specialistId },
    select: { languagePreference: true },
  });
  const locale = specialist ? languageToRoutingLocale[specialist.languagePreference] : routing.defaultLocale;

  await setSessionCookie(result.data.specialistId);

  return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
}
