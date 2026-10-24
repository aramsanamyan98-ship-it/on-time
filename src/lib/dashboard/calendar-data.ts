import { prisma } from "@/lib/prisma";
import type { CalendarRangeData } from "@/lib/dashboard/calendar";

/** Bookings (all statuses) and blocked periods overlapping [from, to) for one specialist. */
export async function loadCalendarRange(specialistId: string, from: Date, to: Date): Promise<CalendarRangeData> {
  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: { specialistId, startAt: { lt: to }, endAt: { gt: from } },
      include: { service: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.blockedTime.findMany({
      where: { specialistId, startAt: { lt: to }, endAt: { gt: from } },
      orderBy: { startAt: "asc" },
    }),
  ]);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    appointments: appointments.map((a) => ({
      id: a.id,
      startAt: a.startAt.toISOString(),
      endAt: a.endAt.toISOString(),
      status: a.status,
      guestName: a.guestName,
      guestPhone: a.guestPhone,
      guestNotes: a.guestNotes,
      serviceName: a.service.name,
    })),
    blocks: blocks.map((b) => ({
      id: b.id,
      startAt: b.startAt.toISOString(),
      endAt: b.endAt.toISOString(),
      reason: b.reason,
    })),
  };
}
