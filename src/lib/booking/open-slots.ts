import { computeSlotsForDay, type TimeRange } from "@/lib/booking/availability";
import { utcToZonedDateStr, addDaysToDateStr, dayOfWeekFromDateStr } from "@/lib/booking/timezone";
import type { DaySchedule } from "@/lib/working-hours/defaults";

// "Fill my schedule" looks this far ahead — a Story is only worth posting
// for a slot that's about to happen.
export const OPEN_SLOT_HORIZON_HOURS = 48;

export const MAX_ALTERNATIVE_SLOTS = 5;

// Slots sit on a 15-minute grid (availability.ts), so the "next" slots after
// the first are near-duplicates of it. Alternatives are spread at least this
// far apart so the specialist is actually choosing between different times.
export const MIN_ALTERNATIVE_SPACING_MINUTES = 60;

/**
 * Pure: every open start time for one service within the next
 * `horizonHours`, soonest first. Delegates the actual working-hours / day-off
 * / busy-range / duration / minimum-notice math to `computeSlotsForDay`, the
 * same function the booking wizard uses, so a suggested slot is by
 * construction one a guest can book. Just walks the (up to three) local
 * calendar dates the window touches and trims to the window.
 */
export function computeOpenSlots(params: {
  schedule: DaySchedule[];
  busyRanges: TimeRange[];
  serviceDurationMinutes: number;
  timezone: string;
  now: Date;
  horizonHours?: number;
}): Date[] {
  const { schedule, busyRanges, serviceDurationMinutes, timezone, now } = params;
  const horizonEnd = new Date(now.getTime() + (params.horizonHours ?? OPEN_SLOT_HORIZON_HOURS) * 3_600_000);
  const scheduleByDay = new Map(schedule.map((d) => [d.dayOfWeek, d]));

  const lastDateStr = utcToZonedDateStr(horizonEnd, timezone);
  const slots: Date[] = [];
  for (
    let dateStr = utcToZonedDateStr(now, timezone);
    dateStr <= lastDateStr;
    dateStr = addDaysToDateStr(dateStr, 1)
  ) {
    const daySchedule = scheduleByDay.get(dayOfWeekFromDateStr(dateStr) as DaySchedule["dayOfWeek"]);
    if (!daySchedule) continue;
    const daySlots = computeSlotsForDay({
      dateStr,
      schedule: daySchedule,
      serviceDurationMinutes,
      timezone,
      busyRanges,
      now,
    });
    for (const slot of daySlots) {
      if (slot.start < horizonEnd) slots.push(slot.start);
    }
  }
  return slots;
}

export type SlotSuggestion = { suggested: Date; alternatives: Date[] };

/** The soonest slot plus a few later ones spaced out from each other; null when there are no slots. */
export function pickSuggestion(slots: Date[]): SlotSuggestion | null {
  if (slots.length === 0) return null;
  const [suggested, ...rest] = slots;
  const spacingMs = MIN_ALTERNATIVE_SPACING_MINUTES * 60_000;

  const alternatives: Date[] = [];
  let lastPicked = suggested.getTime();
  for (const slot of rest) {
    if (alternatives.length >= MAX_ALTERNATIVE_SLOTS) break;
    if (slot.getTime() - lastPicked >= spacingMs) {
      alternatives.push(slot);
      lastPicked = slot.getTime();
    }
  }
  return { suggested, alternatives };
}

/** How many "next free times" the public booking page shows. */
export const NEXT_FREE_SLOT_COUNT = 4;

/**
 * Appends to `picked` from `slots` (soonest first) until it holds `count`
 * entries, skipping near-duplicates: slots sit on a 15-minute grid, so
 * without spacing "next free times" would be 15:00, 15:15, 15:30, ... The
 * first slot ever seen is always taken. Mutates and returns `picked` so a
 * day-by-day search can keep feeding it.
 */
export function appendSpreadSlots(
  picked: Date[],
  slots: Date[],
  count: number = NEXT_FREE_SLOT_COUNT,
  spacingMinutes: number = MIN_ALTERNATIVE_SPACING_MINUTES,
): Date[] {
  const spacingMs = spacingMinutes * 60_000;
  for (const slot of slots) {
    if (picked.length >= count) break;
    const last = picked[picked.length - 1];
    if (!last || slot.getTime() - last.getTime() >= spacingMs) picked.push(slot);
  }
  return picked;
}
