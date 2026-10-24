import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * The specialist behind /book/[slug]/new, shared by the full page, the popup
 * (intercepting @modal route) and BookingFlow so one request fetches it once.
 * Same "unreachable once unverified/deactivated" rule as the public profile
 * (07_Business_Rules.md) — callers must treat a returned-but-ineligible
 * specialist as not found via `isBookable`.
 */
export const loadBookingSpecialist = cache((slug: string) =>
  prisma.specialist.findUnique({
    where: { slug },
    select: {
      id: true,
      displayName: true,
      slug: true,
      address: true,
      timezone: true,
      emailVerifiedAt: true,
      deletedAt: true,
      trialEndsAt: true,
      subscriptionActiveUntil: true,
    },
  }),
);

export function isReachable(
  specialist: Awaited<ReturnType<typeof loadBookingSpecialist>>,
): specialist is NonNullable<typeof specialist> {
  return !!specialist && !!specialist.emailVerifiedAt && !specialist.deletedAt;
}
