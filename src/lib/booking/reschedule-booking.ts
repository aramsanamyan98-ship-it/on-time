import { prisma } from "@/lib/prisma";
import { isSlotAvailable, type BookingSpecialist } from "@/lib/booking/slots";
import { isSlotConflictError } from "@/lib/booking/conflict-error";
import type { BookingActionResult } from "@/lib/booking/errors";
import type { Appointment } from "@/generated/prisma/client";

/**
 * Shared by the guest self-service link and the specialist dashboard.
 * Runs the exact same isSlotAvailable() check as a brand-new booking
 * (07_Business_Rules.md: "the same double-booking protection applies as
 * any other booking") — a reschedule is not a special case that bypasses
 * conflict checking. `excludeAppointmentId` keeps the appointment's own
 * current slot from blocking itself in that check.
 */
export async function rescheduleAppointment(
  appointment: Appointment,
  specialist: BookingSpecialist,
  serviceDurationMinutes: number,
  newStartAt: Date,
): Promise<BookingActionResult<Appointment>> {
  if (appointment.status === "cancelled") {
    return { ok: false, formError: "alreadyCancelled" };
  }

  const available = await isSlotAvailable(specialist, serviceDurationMinutes, newStartAt, {
    excludeAppointmentId: appointment.id,
  });
  if (!available) return { ok: false, formError: "slotTaken" };

  const newEndAt = new Date(newStartAt.getTime() + serviceDurationMinutes * 60_000);

  try {
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { startAt: newStartAt, endAt: newEndAt },
    });
    return { ok: true, data: updated };
  } catch (err) {
    if (isSlotConflictError(err)) return { ok: false, formError: "slotTaken" };
    throw err;
  }
}
