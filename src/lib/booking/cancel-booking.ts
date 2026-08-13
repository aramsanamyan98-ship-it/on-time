import { prisma } from "@/lib/prisma";
import {
  cancelPendingNotifications,
  enqueueGuestCancelledAlert,
  enqueueGuestRebookingNotice,
} from "@/lib/notifications/queue";
import type { BookingActionResult } from "@/lib/booking/errors";
import type { Appointment, Specialist } from "@/generated/prisma/client";

/**
 * Shared by both the guest self-service link and the specialist dashboard
 * (07_Business_Rules.md: either can cancel at any time), and by the
 * blocked-time conflict flow (src/lib/booking/blocked-time.ts), which calls
 * this once per conflicting appointment. Callers are responsible for
 * loading + authorizing `appointment` first (by booking_token for guests,
 * by specialistId ownership for the dashboard) — this function only
 * applies the state change once that's established. `initiatedBy` decides
 * who gets notified: the specialist is alerted when a *guest* cancels via
 * their link (07_Business_Rules.md), and the guest gets a rebooking-assist
 * notice (with a link back into the same reschedule slot-picker) when the
 * *specialist* is the one cancelling — it doesn't change the cancellation
 * itself.
 */
export async function cancelAppointment(
  appointment: Appointment,
  specialist: Specialist,
  initiatedBy: "guest" | "specialist",
): Promise<BookingActionResult<Appointment>> {
  if (appointment.status === "cancelled") {
    return { ok: false, formError: "alreadyCancelled" };
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "cancelled" },
  });
  await cancelPendingNotifications(updated.id);
  if (initiatedBy === "guest") {
    await enqueueGuestCancelledAlert(updated, specialist);
  } else {
    await enqueueGuestRebookingNotice(updated);
  }
  return { ok: true, data: updated };
}
