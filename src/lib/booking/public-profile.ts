import { addDaysToDateStr, dayOfWeekFromDateStr, utcToZonedDateStr, utcToZonedTimeStr } from "@/lib/booking/timezone";
import type { DayOfWeek, DaySchedule } from "@/lib/working-hours/defaults";

/**
 * Pure helpers for the public booking page (no Prisma, no React), kept
 * separate so they can be unit-tested.
 */

export type OpenStatus =
  | { kind: "open"; until: string }
  | { kind: "closed"; opens: { dayOffset: number; dayOfWeek: DayOfWeek; time: string } }
  // Every day is a day off, so there is no "next opening" to name.
  | { kind: "closedAlways" };

/** "Open now / Closed" from the weekly schedule, evaluated in the specialist's own timezone. */
export function computeOpenStatus(schedule: DaySchedule[], timezone: string, now: Date): OpenStatus {
  const byDay = new Map(schedule.map((d) => [d.dayOfWeek, d]));
  const today = utcToZonedDateStr(now, timezone);
  const time = utcToZonedTimeStr(now, timezone);

  for (let offset = 0; offset < 8; offset++) {
    const dayOfWeek = dayOfWeekFromDateStr(addDaysToDateStr(today, offset)) as DayOfWeek;
    const day = byDay.get(dayOfWeek);
    if (!day || day.isDayOff) continue;

    if (offset === 0) {
      if (time >= day.startTime && time < day.endTime) return { kind: "open", until: day.endTime };
      if (time >= day.endTime) continue;
    }
    return { kind: "closed", opens: { dayOffset: offset, dayOfWeek, time: day.startTime } };
  }
  return { kind: "closedAlways" };
}

export type HoursRow = {
  days: DayOfWeek[];
  isToday: boolean;
  isDayOff: boolean;
  startTime: string;
  endTime: string;
};

const MONDAY_FIRST: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

/** Weekly hours, Monday first, merging neighbouring days with identical hours; today always gets its own row so it can be highlighted. */
export function groupHours(schedule: DaySchedule[], todayDayOfWeek: DayOfWeek): HoursRow[] {
  const byDay = new Map(schedule.map((d) => [d.dayOfWeek, d]));
  const rows: HoursRow[] = [];

  for (const dayOfWeek of MONDAY_FIRST) {
    const day = byDay.get(dayOfWeek);
    if (!day) continue;
    const isToday = dayOfWeek === todayDayOfWeek;
    const last = rows[rows.length - 1];
    const sameAsLast =
      last &&
      !last.isToday &&
      !isToday &&
      last.isDayOff === day.isDayOff &&
      (day.isDayOff || (last.startTime === day.startTime && last.endTime === day.endTime));

    if (sameAsLast) {
      last.days.push(dayOfWeek);
    } else {
      rows.push({
        days: [dayOfWeek],
        isToday,
        isDayOff: day.isDayOff,
        startTime: day.startTime,
        endTime: day.endTime,
      });
    }
  }
  return rows;
}

export type SlotDayKind = "today" | "tomorrow" | "other";

export function slotDayKind(slot: Date, now: Date, timezone: string): SlotDayKind {
  const today = utcToZonedDateStr(now, timezone);
  const slotDate = utcToZonedDateStr(slot, timezone);
  if (slotDate === today) return "today";
  if (slotDate === addDaysToDateStr(today, 1)) return "tomorrow";
  return "other";
}

/** Map search/directions links built from the free-text address (no coordinates are stored). */
export function mapLinks(address: string) {
  const q = encodeURIComponent(address.trim());
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
    yandex: `https://yandex.com/maps/?text=${q}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
  };
}

/** "tel:" href with only dialable characters, so spaces/dashes in the stored number don't break the link. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** Thousands-grouped amount ("5 000"); a fixed no-break space keeps server and client output identical. */
export function formatAmount(amount: number): string {
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** The shortest active service decides which service "next free times" are computed for (and preselected on tap). */
export function shortestService<T extends { durationMinutes: number; priceAmd: number }>(services: T[]): T | null {
  let best: T | null = null;
  for (const service of services) {
    if (
      !best ||
      service.durationMinutes < best.durationMinutes ||
      (service.durationMinutes === best.durationMinutes && service.priceAmd < best.priceAmd)
    ) {
      best = service;
    }
  }
  return best;
}
