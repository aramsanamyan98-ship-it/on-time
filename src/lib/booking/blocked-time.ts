import { prisma } from "@/lib/prisma";
import type { Appointment, Service } from "@/generated/prisma/client";

export type ConflictingAppointment = Appointment & { service: Service };

/**
 * Rebooking-assist feature: confirmed/active appointments whose
 * [startAt, endAt) range overlaps a *proposed* blocked-time range — the
 * reverse direction of loadBusyRanges in slots.ts (that keeps new bookings
 * out of existing blocked time; this checks a new block against
 * appointments that already exist). Same "not cancelled" definition of
 * busy as slots.ts, and the same half-open interval overlap test (two
 * ranges overlap iff each starts before the other ends).
 *
 * Callers must run this *before* writing the BlockedTime row and require
 * the specialist to confirm if it's non-empty (see
 * src/app/[locale]/dashboard/blocked-time/actions.ts) — creating the block
 * must never silently orphan a guest's appointment.
 */
export async function findConflictingAppointments(
  specialistId: string,
  startAt: Date,
  endAt: Date,
): Promise<ConflictingAppointment[]> {
  return prisma.appointment.findMany({
    where: {
      specialistId,
      status: { not: "cancelled" },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    include: { service: true },
    orderBy: { startAt: "asc" },
  });
}
