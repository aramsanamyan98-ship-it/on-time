import { prisma } from "@/lib/prisma";
import { cancelPendingNotifications, enqueueGuestCancelledAlert } from "@/lib/notifications/queue";
import type { BookingActionResult } from "@/lib/booking/errors";
import type { Appointment, Specialist } from "@/generated/prisma/client";

/**
 * Shared by both the guest self-service link and the specialist dashboard
 * (07_Business_Rules.md: either can cancel at any time). Callers are
 * responsible for loading + authorizing `appointment` first (by
 * booking_token for guests, by specialistId ownership for the dashboard) —
 * this function only applies the state change once that's established.
 * `initiatedBy` only decides who gets notified (07_Business_Rules.md: the
 * specialist is alerted when a *guest* cancels via their link) — it
 * doesn't change the cancellation itself.
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
  }
  return { ok: true, data: updated };
}
