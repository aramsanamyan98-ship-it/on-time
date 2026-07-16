import { prisma } from "@/lib/prisma";
import type { BookingActionResult } from "@/lib/booking/errors";
import type { Appointment } from "@/generated/prisma/client";

/**
 * Shared by both the guest self-service link and the specialist dashboard
 * (07_Business_Rules.md: either can cancel at any time). Callers are
 * responsible for loading + authorizing `appointment` first (by
 * booking_token for guests, by specialistId ownership for the dashboard) —
 * this function only applies the state change once that's established.
 */
export async function cancelAppointment(appointment: Appointment): Promise<BookingActionResult<Appointment>> {
  if (appointment.status === "cancelled") {
    return { ok: false, formError: "alreadyCancelled" };
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "cancelled" },
  });
  return { ok: true, data: updated };
}
