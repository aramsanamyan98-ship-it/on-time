import { prisma } from "@/lib/prisma";
import { defaultSchedule, type DaySchedule } from "@/lib/working-hours/defaults";

/** Merges a specialist's saved working-hours rows over the defaults, one entry per day of week. */
export async function loadSchedule(specialistId: string): Promise<DaySchedule[]> {
  const rows = await prisma.workingHours.findMany({ where: { specialistId } });
  const byDay = new Map(rows.map((row) => [row.dayOfWeek, row]));

  return defaultSchedule().map((fallback) => {
    const row = byDay.get(fallback.dayOfWeek);
    if (!row) return fallback;
    return {
      dayOfWeek: fallback.dayOfWeek,
      isDayOff: row.isDayOff,
      startTime: row.startTime ?? fallback.startTime,
      endTime: row.endTime ?? fallback.endTime,
    };
  });
}
