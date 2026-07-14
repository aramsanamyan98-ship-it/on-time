import { prisma } from "@/lib/prisma";
import { validateDay, type DayFieldErrors } from "@/lib/working-hours/validation";
import type { DaySchedule, DayOfWeek } from "@/lib/working-hours/defaults";

export type WorkingHoursResult =
  | { ok: true }
  | { ok: false; dayErrors: Partial<Record<DayOfWeek, DayFieldErrors>> };

export async function updateWorkingHours(
  specialistId: string,
  days: DaySchedule[],
): Promise<WorkingHoursResult> {
  const dayErrors: Partial<Record<DayOfWeek, DayFieldErrors>> = {};
  for (const day of days) {
    const errors = validateDay(day);
    if (errors) dayErrors[day.dayOfWeek] = errors;
  }

  if (Object.keys(dayErrors).length > 0) {
    return { ok: false, dayErrors };
  }

  await prisma.$transaction(
    days.map((day) =>
      prisma.workingHours.upsert({
        where: { specialistId_dayOfWeek: { specialistId, dayOfWeek: day.dayOfWeek } },
        create: {
          specialistId,
          dayOfWeek: day.dayOfWeek,
          isDayOff: day.isDayOff,
          startTime: day.isDayOff ? null : day.startTime,
          endTime: day.isDayOff ? null : day.endTime,
        },
        update: {
          isDayOff: day.isDayOff,
          startTime: day.isDayOff ? null : day.startTime,
          endTime: day.isDayOff ? null : day.endTime,
        },
      }),
    ),
  );

  return { ok: true };
}
