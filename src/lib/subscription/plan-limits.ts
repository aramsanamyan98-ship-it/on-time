import { prisma } from "@/lib/prisma";
import { hasFullAccess } from "@/lib/subscription/trial";
import type { Specialist } from "@/generated/prisma/client";

// 02_PRD.md Section 14 (updated): Basic (the cheapest paid tier, 4,000
// AMD/month) is capped at 5 portfolio photos; Starter/Pro (and anyone
// still in their trial, which grants Starter-level access — see
// hasFullAccess) get unlimited photos. Bookings themselves are uncapped on
// every plan, including Basic — this replaces the old ~30 bookings/month
// Basic cap.
export const BASIC_PLAN_PORTFOLIO_PHOTO_LIMIT = 5;

export async function countPortfolioPhotos(specialistId: string): Promise<number> {
  return prisma.portfolioPhoto.count({ where: { specialistId } });
}

/**
 * Enforces 02_PRD.md Section 14's Basic-plan portfolio photo cap. Starter/
 * Pro specialists and anyone still inside their trial are exempt
 * (hasFullAccess) — this only ever blocks a specialist who is both on the
 * `basic` plan value AND past trial expiry, i.e. actually on Basic.
 */
export async function hasReachedBasicPortfolioPhotoLimit(specialist: Specialist): Promise<boolean> {
  if (hasFullAccess(specialist)) return false;
  const count = await countPortfolioPhotos(specialist.id);
  return count >= BASIC_PLAN_PORTFOLIO_PHOTO_LIMIT;
}
