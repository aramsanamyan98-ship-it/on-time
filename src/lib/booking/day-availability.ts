import { addDaysToDateStr } from "@/lib/booking/timezone";
import type { DaySchedule } from "@/lib/working-hours/defaults";

/**
 * Pure helpers behind the booking popup's 14-day strip (no Prisma, no React).
 * The server action in slots.ts feeds these real schedule/busy data.
 */

export type DayStatus = "open" | "dayOff" | "full";
export type DayAvailability = { dateStr: string; status: DayStatus };

export const DAY_STRIP_LENGTH = 14;

/** A day is a day off, fully booked (working day, no bookable slot left), or open. */
export function classifyDay(schedule: DaySchedule | undefined, openSlotCount: number): DayStatus {
  if (!schedule || schedule.isDayOff) return "dayOff";
  return openSlotCount > 0 ? "open" : "full";
}

/** The `length` consecutive "YYYY-MM-DD" dates starting at `fromDateStr`. */
export function buildDayRange(fromDateStr: string, length: number = DAY_STRIP_LENGTH): string[] {
  return Array.from({ length }, (_, i) => addDaysToDateStr(fromDateStr, i));
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A client-supplied window start is clamped to "not before today" (in the
 * barber's timezone) and rejected when malformed or absurdly far ahead.
 */
export function clampWindowStart(requested: string | undefined, todayDateStr: string, maxDaysAhead = 400): string {
  if (!requested || !DATE_RE.test(requested)) return todayDateStr;
  if (requested < todayDateStr) return todayDateStr;
  if (requested > addDaysToDateStr(todayDateStr, maxDaysAhead)) return todayDateStr;
  return requested;
}
