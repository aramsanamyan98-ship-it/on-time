import { prisma } from "@/lib/prisma";
import { isSlotAvailable } from "@/lib/booking/slots";
import { isSlotConflictError } from "@/lib/booking/conflict-error";
import { enqueueBookingNotifications, enqueueNewBookingAlert } from "@/lib/notifications/queue";
import type { BookingActionResult } from "@/lib/booking/errors";
import type { Appointment, Specialist } from "@/generated/prisma/client";

/**
 * Rebooking-assist feature: the guest self-service half of the flow, reached
 * from the same booking_token link and reschedule slot-picker as an active
 * appointment's reschedule (see ManageBooking.tsx / SlotPicker), but for an
 * appointment the *specialist* already cancelled (direct cancel, or a
 * blocked-time conflict). Deliberately a separate function from
 * rescheduleAppointment (which explicitly rejects a cancelled appointment)
 * rather than a branch inside it: rescheduling moves a *live* booking,
 * while this reactivates a *cancelled* one — different guard, different
 * notifications (a fresh confirmation, not a reschedule alert), and only
 * ever guest-initiated (a specialist doesn't need this path; they'd just
 * create a new manual booking).
 *
 * Re-uses the appointment's existing row (same booking_token, same guest
 * details, same service) rather than creating a new appointment — so the
 * guest only has to pick a new date/time, never re-enter their details.
 */
export async function rebookAppointment(
  appointment: Appointment,
  specialist: Specialist,
  serviceDurationMinutes: number,
  newStartAt: Date,
): Promise<BookingActionResult<Appointment>> {
  if (appointment.status !== "cancelled") {
    return { ok: false, formError: "notCancelled" };
  }

  const available = await isSlotAvailable(specialist, serviceDurationMinutes, newStartAt, {
    excludeAppointmentId: appointment.id,
  });
  if (!available) return { ok: false, formError: "slotTaken" };

  const newEndAt = new Date(newStartAt.getTime() + serviceDurationMinutes * 60_000);

  try {
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "confirmed", startAt: newStartAt, endAt: newEndAt },
    });
    await enqueueBookingNotifications(updated);
    // Mirrors createGuestBooking (07_Business_Rules.md "New booking
    // notification sent to specialist"): from the specialist's dashboard,
    // a rebook is indistinguishable from a fresh guest booking landing on
    // their calendar.
    await enqueueNewBookingAlert(updated, specialist);
    return { ok: true, data: updated };
  } catch (err) {
    if (isSlotConflictError(err)) return { ok: false, formError: "slotTaken" };
    throw err;
  }
}
