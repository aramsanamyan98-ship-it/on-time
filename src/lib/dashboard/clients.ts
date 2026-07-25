import { prisma } from "@/lib/prisma";

export type ClientSummary = {
  guestPhone: string;
  guestName: string;
  guestEmail: string | null;
  appointmentCount: number;
  lastVisit: Date;
};

/**
 * "Client list" per 02_PRD.md Section 10: not backed by a `customers` table
 * (05_Database.md explicitly defers that) — a client is just the set of
 * appointments sharing one guest_phone against this specialist, the same
 * identity key appointments already use. Grouped in application code
 * rather than a DB `groupBy` so the most recent name/email (people's name
 * spelling or email can drift between bookings) naturally wins by being
 * seen first in the `startAt desc` scan — fine at the list size a single
 * specialist's client book actually reaches.
 */
export async function listClients(specialistId: string): Promise<ClientSummary[]> {
  const appointments = await prisma.appointment.findMany({
    where: { specialistId },
    select: { guestName: true, guestPhone: true, guestEmail: true, startAt: true },
    orderBy: { startAt: "desc" },
  });

  const clients = new Map<string, ClientSummary>();
  for (const appointment of appointments) {
    const existing = clients.get(appointment.guestPhone);
    if (existing) {
      existing.appointmentCount += 1;
    } else {
      clients.set(appointment.guestPhone, {
        guestPhone: appointment.guestPhone,
        guestName: appointment.guestName,
        guestEmail: appointment.guestEmail,
        appointmentCount: 1,
        lastVisit: appointment.startAt,
      });
    }
  }

  return Array.from(clients.values());
}
