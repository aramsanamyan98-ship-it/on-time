import { prisma } from "@/lib/prisma";
import { utcToZonedDateStr, zonedTimeToUtc } from "@/lib/booking/timezone";
import { hasFullAccess } from "@/lib/subscription/trial";
import type { Specialist } from "@/generated/prisma/client";

// 02_PRD.md Section 14: Basic (Free) plan includes "limited bookings
// (~30/month)"; Starter/Pro are unlimited, as is an active trial (which
// grants Starter-level access — see hasFullAccess).
export const BASIC_PLAN_MONTHLY_BOOKING_LIMIT = 30;

function monthWindow(now: Date, timezone: string): { start: Date; end: Date } {
  const [year, month] = utcToZonedDateStr(now, timezone).split("-").map(Number);
  const start = zonedTimeToUtc(`${year}-${String(month).padStart(2, "0")}-01`, "00:00", timezone);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = zonedTimeToUtc(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`, "00:00", timezone);
  return { start, end };
}

/**
 * Counted by `createdAt` (when the booking was made), not `startAt` — this
 * is a usage cap on how much of the app a Basic specialist can consume in a
 * given calendar month, not a cap on how far out they can be booked.
 */
export async function countBookingsThisMonth(specialist: Pick<Specialist, "id" | "timezone">): Promise<number> {
  const { start, end } = monthWindow(new Date(), specialist.timezone);
  return prisma.appointment.count({
    where: {
      specialistId: specialist.id,
      status: { not: "cancelled" },
      createdAt: { gte: start, lt: end },
    },
  });
}

/**
 * Enforces 02_PRD.md Section 14's Basic-plan monthly booking cap. Starter/
 * Pro specialists and anyone still inside their trial are exempt
 * (hasFullAccess) — this only ever blocks a specialist who is both on the
 * `basic` plan value AND past trial expiry, i.e. actually on Basic.
 */
export async function hasReachedBasicBookingLimit(specialist: Specialist): Promise<boolean> {
  if (hasFullAccess(specialist)) return false;
  const count = await countBookingsThisMonth(specialist);
  return count >= BASIC_PLAN_MONTHLY_BOOKING_LIMIT;
}
