import { prisma } from "@/lib/prisma";
import { loadSchedule } from "@/lib/working-hours/load-schedule";
import { computeSlotsForDay, MAX_SEARCH_DAYS, type TimeRange } from "@/lib/booking/availability";
import { utcToZonedDateStr, addDaysToDateStr, dayOfWeekFromDateStr } from "@/lib/booking/timezone";
import type { DayOfWeek } from "@/lib/working-hours/defaults";

export type BookingSpecialist = { id: string; timezone: string };

async function loadBusyRanges(
  specialistId: string,
  now: Date,
  excludeAppointmentId?: string,
): Promise<TimeRange[]> {
  const [appointments, blockedTime] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        specialistId,
        status: { not: "cancelled" },
        endAt: { gt: now },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      select: { startAt: true, endAt: true },
    }),
    prisma.blockedTime.findMany({
      where: { specialistId, endAt: { gt: now } },
      select: { startAt: true, endAt: true },
    }),
  ]);

  return [
    ...appointments.map((a) => ({ start: a.startAt, end: a.endAt })),
    ...blockedTime.map((b) => ({ start: b.startAt, end: b.endAt })),
  ];
}

/** Available slots for one specific calendar date (in the specialist's local timezone). */
export async function getSlotsForDate(
  specialist: BookingSpecialist,
  serviceDurationMinutes: number,
  dateStr: string,
  options?: { excludeAppointmentId?: string },
): Promise<{ isWorkingDay: boolean; slots: Date[] }> {
  const now = new Date();
  const [schedule, busyRanges] = await Promise.all([
    loadSchedule(specialist.id),
    loadBusyRanges(specialist.id, now, options?.excludeAppointmentId),
  ]);

  const daySchedule = schedule.find((d) => d.dayOfWeek === dayOfWeekFromDateStr(dateStr));
  if (!daySchedule) return { isWorkingDay: false, slots: [] };

  const slots = computeSlotsForDay({
    dateStr,
    schedule: daySchedule,
    serviceDurationMinutes,
    timezone: specialist.timezone,
    busyRanges,
    now,
  });

  return { isWorkingDay: !daySchedule.isDayOff, slots: slots.map((s) => s.start) };
}

/**
 * Walks forward day by day from today (in the specialist's local calendar)
 * and returns the first open slot — 07_Business_Rules.md: "the booking page
 * always shows the earliest available slot first" and explicitly forbids
 * an artificial horizon cap. MAX_SEARCH_DAYS is a safety valve, not a
 * product limit — see its doc comment in availability.ts.
 */
export async function findEarliestAvailable(
  specialist: BookingSpecialist,
  serviceDurationMinutes: number,
  options?: { excludeAppointmentId?: string },
): Promise<{ dateStr: string; slot: Date } | null> {
  const now = new Date();
  const [schedule, busyRanges] = await Promise.all([
    loadSchedule(specialist.id),
    loadBusyRanges(specialist.id, now, options?.excludeAppointmentId),
  ]);
  const scheduleByDay = new Map(schedule.map((d) => [d.dayOfWeek, d]));

  let cursor = utcToZonedDateStr(now, specialist.timezone);
  for (let i = 0; i < MAX_SEARCH_DAYS; i++) {
    const daySchedule = scheduleByDay.get(dayOfWeekFromDateStr(cursor) as DayOfWeek);
    if (daySchedule) {
      const slots = computeSlotsForDay({
        dateStr: cursor,
        schedule: daySchedule,
        serviceDurationMinutes,
        timezone: specialist.timezone,
        busyRanges,
        now,
      });
      if (slots.length > 0) return { dateStr: cursor, slot: slots[0].start };
    }
    cursor = addDaysToDateStr(cursor, 1);
  }

  return null;
}

/** Re-derives the day's slot list and checks the exact requested instant is in it — the single source of truth for "is this slot genuinely open" used by every booking/reschedule path. */
export async function isSlotAvailable(
  specialist: BookingSpecialist,
  serviceDurationMinutes: number,
  startAt: Date,
  options?: { excludeAppointmentId?: string },
): Promise<boolean> {
  const dateStr = utcToZonedDateStr(startAt, specialist.timezone);
  const { slots } = await getSlotsForDate(specialist, serviceDurationMinutes, dateStr, options);
  return slots.some((slot) => slot.getTime() === startAt.getTime());
}
