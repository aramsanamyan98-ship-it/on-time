import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { Specialist } from "@/generated/prisma/client";

/**
 * Shared guard for every dashboard page: loads the logged-in specialist or
 * redirects to /login. Mirrors the check every auth screen already does
 * (see dashboard/page.tsx) so Phase 2 pages don't each re-implement it.
 * `redirect()` throws (return type `never`), so callers can treat the
 * resolved value as always defined.
 */
export async function requireSpecialist(locale: AppLocale): Promise<Specialist> {
  const session = await getSession();
  if (!session) {
    return redirect({ href: "/login", locale });
  }

  const specialist = await prisma.specialist.findUnique({ where: { id: session.specialistId } });
  if (!specialist || !specialist.emailVerifiedAt || specialist.deletedAt) {
    return redirect({ href: "/login", locale });
  }

  return specialist;
}
