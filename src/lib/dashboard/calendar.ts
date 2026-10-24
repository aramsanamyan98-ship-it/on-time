import {
  addDaysToDateStr,
  dayOfWeekFromDateStr,
  utcToZonedDateStr,
  utcToZonedTimeStr,
  zonedTimeToUtc,
} from "@/lib/booking/timezone";

/**
 * Pure helpers for the dashboard Appointments calendar (no Prisma, no React)
 * so they can be unit-tested. Data crosses the server/client boundary as
 * these plain serializable shapes (ISO strings, not Dates).
 */

export type CalendarStatus = "confirmed" | "cancelled" | "completed" | "no_show";

export type CalendarAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: CalendarStatus;
  guestName: string;
  guestPhone: string;
  guestNotes: string | null;
  serviceName: string;
};

export type CalendarBlock = {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
};

export type CalendarRangeData = {
  from: string;
  to: string;
  appointments: CalendarAppointment[];
  blocks: CalendarBlock[];
};

export type CalendarWorkingHour = {
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  isDayOff: boolean;
};

export const DEFAULT_SLOT_MIN = "08:00:00";
export const DEFAULT_SLOT_MAX = "22:00:00";

/** Longest range the read-only range action will serve (week view + padding). */
export const MAX_RANGE_DAYS = 42;

const OUTCOME_STATUSES: CalendarStatus[] = ["confirmed", "completed", "no_show"];

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatHour(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:00:00`;
}

/** FullCalendar `businessHours` entries: one per working day (days off omitted so they shade as non-business). */
export function workingBusinessHours(hours: CalendarWorkingHour[]) {
  return hours
    .filter((h) => !h.isDayOff && h.startTime && h.endTime)
    .map((h) => ({ daysOfWeek: [h.dayOfWeek], startTime: h.startTime as string, endTime: h.endTime as string }));
}

/**
 * Visible time-grid range: earliest working start to latest working end across
 * the week, padded by an hour (08:00-22:00 when no hours are set), widened so
 * a booking outside the working hours is never clipped off the grid.
 */
export function visibleTimeRange(
  hours: CalendarWorkingHour[],
  appointments: CalendarAppointment[],
  timeZone: string,
): { min: string; max: string } {
  const working = hours.filter((h) => !h.isDayOff && h.startTime && h.endTime);
  let minM = toMinutes(DEFAULT_SLOT_MIN);
  let maxM = toMinutes(DEFAULT_SLOT_MAX);
  if (working.length > 0) {
    minM = Math.max(0, Math.min(...working.map((h) => toMinutes(h.startTime as string))) - 60);
    maxM = Math.min(1440, Math.max(...working.map((h) => toMinutes(h.endTime as string))) + 60);
  }

  for (const a of appointments) {
    const start = new Date(a.startAt);
    const end = new Date(a.endAt);
    minM = Math.min(minM, Math.floor(toMinutes(utcToZonedTimeStr(start, timeZone)) / 60) * 60);
    // An appointment running past local midnight needs the whole evening.
    const endM =
      utcToZonedDateStr(end, timeZone) === utcToZonedDateStr(start, timeZone)
        ? toMinutes(utcToZonedTimeStr(end, timeZone))
        : 1440;
    maxM = Math.max(maxM, Math.ceil(endM / 60) * 60);
  }

  minM = Math.max(0, Math.min(minM, 1380));
  maxM = Math.min(1440, Math.max(Math.ceil(maxM / 60) * 60, minM + 60));
  return { min: formatHour(minM), max: maxM === 1440 ? "24:00:00" : formatHour(maxM) };
}

/**
 * The initial server-rendered range: the Monday-start week containing `now`
 * in `timeZone`, padded by a day on each side (so day and week views for
 * today are both covered).
 */
export function initialCalendarRange(now: Date, timeZone: string): { from: Date; to: Date } {
  const today = utcToZonedDateStr(now, timeZone);
  const monday = addDaysToDateStr(today, -((dayOfWeekFromDateStr(today) + 6) % 7));
  return {
    from: zonedTimeToUtc(addDaysToDateStr(monday, -1), "00:00", timeZone),
    to: zonedTimeToUtc(addDaysToDateStr(monday, 8), "00:00", timeZone),
  };
}

/** Parses and validates a client-supplied range; null when malformed, inverted or too wide. */
export function parseCalendarRange(fromRaw: string, toRaw: string): { from: Date; to: Date } | null {
  const from = new Date(fromRaw);
  const to = new Date(toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  if (to <= from) return null;
  if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000) return null;
  return { from, to };
}

/** Completed / no-show can be set (or switched between) once a non-cancelled booking has ended. */
export function canMarkOutcome(status: CalendarStatus, endAt: Date | string, now: Date = new Date()): boolean {
  return OUTCOME_STATUSES.includes(status) && new Date(endAt).getTime() <= now.getTime();
}
