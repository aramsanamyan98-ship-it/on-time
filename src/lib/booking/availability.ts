import { zonedTimeToUtc } from "@/lib/booking/timezone";
import type { DaySchedule } from "@/lib/working-hours/defaults";

// Candidate slot start times are generated on a fixed grid rather than
// packed immediately after each other — 15 minutes is fine granularity for
// a solo-specialist calendar without generating an excessive number of
// candidates. Not specified in 07_Business_Rules.md; documented here as
// the implementation choice.
export const SLOT_GRANULARITY_MINUTES = 15;

// 07_Business_Rules.md leaves the minimum-notice window as an open, low-
// stakes decision with "a sensible default of 0–30 minutes is fine to ship
// with and adjust later." Picking 30.
export const MINIMUM_NOTICE_MINUTES = 30;

// NOT a booking-horizon cap (07_Business_Rules.md explicitly forbids one).
// This only bounds how many days the earliest-slot search will walk
// forward before giving up, as a safety valve against looping forever for
// a specialist with no working days at all / no availability for over a
// year. ~13 months.
export const MAX_SEARCH_DAYS = 400;

export type TimeRange = { start: Date; end: Date };

function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && a.end > b.start;
}

/**
 * Pure slot computation for one calendar date. `busyRanges` should already
 * be filtered to whatever's relevant to this specialist (existing non-
 * cancelled appointments + blocked time) — this function just does the
 * range math, so the exact same logic can back a fresh booking, a guest
 * reschedule, and a specialist reschedule (07_Business_Rules.md: "not a
 * special case that bypasses conflict checking").
 */
export function computeSlotsForDay(params: {
  dateStr: string; // "YYYY-MM-DD" in the specialist's local calendar
  schedule: DaySchedule;
  serviceDurationMinutes: number;
  timezone: string;
  busyRanges: TimeRange[];
  now: Date;
}): TimeRange[] {
  const { dateStr, schedule, serviceDurationMinutes, timezone, busyRanges, now } = params;
  if (schedule.isDayOff || !schedule.startTime || !schedule.endTime) return [];

  const dayStart = zonedTimeToUtc(dateStr, schedule.startTime, timezone);
  const dayEnd = zonedTimeToUtc(dateStr, schedule.endTime, timezone);
  const earliestBookable = new Date(now.getTime() + MINIMUM_NOTICE_MINUTES * 60_000);
  const durationMs = serviceDurationMinutes * 60_000;
  const stepMs = SLOT_GRANULARITY_MINUTES * 60_000;

  const slots: TimeRange[] = [];
  for (let start = dayStart.getTime(); start + durationMs <= dayEnd.getTime(); start += stepMs) {
    const candidate: TimeRange = { start: new Date(start), end: new Date(start + durationMs) };
    if (candidate.start < earliestBookable) continue;
    if (busyRanges.some((busy) => rangesOverlap(candidate, busy))) continue;
    slots.push(candidate);
  }

  return slots;
}
