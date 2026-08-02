import { prisma } from "@/lib/prisma";
import { isSlotAvailable } from "@/lib/booking/slots";
import { isSlotConflictError } from "@/lib/booking/conflict-error";
import {
  rescheduleReminderNotification,
  rescheduleReviewRequestNotification,
  enqueueGuestRescheduledAlert,
} from "@/lib/notifications/queue";
import type { BookingActionResult } from "@/lib/booking/errors";
import type { Appointment, Specialist } from "@/generated/prisma/client";

/**
 * Shared by the guest self-service link and the specialist dashboard.
 * Runs the exact same isSlotAvailable() check as a brand-new booking
 * (07_Business_Rules.md: "the same double-booking protection applies as
 * any other booking") — a reschedule is not a special case that bypasses
 * conflict checking. `excludeAppointmentId` keeps the appointment's own
 * current slot from blocking itself in that check. `initiatedBy` only
 * decides who gets notified (07_Business_Rules.md: the specialist is
 * alerted when a *guest* reschedules via their link) — it doesn't change
 * the reschedule itself. `specialist` takes the full model (not just the
 * `{id, timezone}` shape `isSlotAvailable` needs) because the alert also
 * needs the specialist's email/language.
 */
export async function rescheduleAppointment(
  appointment: Appointment,
  specialist: Specialist,
  serviceDurationMinutes: number,
  newStartAt: Date,
  initiatedBy: "guest" | "specialist",
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
    await rescheduleReminderNotification(updated, specialist);
    await rescheduleReviewRequestNotification(updated);
    if (initiatedBy === "guest") {
      await enqueueGuestRescheduledAlert(updated, specialist);
    }
    return { ok: true, data: updated };
  } catch (err) {
    if (isSlotConflictError(err)) return { ok: false, formError: "slotTaken" };
    throw err;
  }
}
