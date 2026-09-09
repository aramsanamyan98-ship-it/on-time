import { prisma } from "@/lib/prisma";
import type { NotificationType, Specialist } from "@/generated/prisma/client";

/**
 * The three notification types that only ever get enqueued for a
 * guest-initiated event (new guest booking, guest-initiated cancel, guest-
 * initiated reschedule) — never for a specialist's own manual entry or
 * dashboard cancel/reschedule. See the `initiatedBy` gating in
 * src/lib/booking/cancel-booking.ts / reschedule-booking.ts and the
 * "Guest-initiated only" comment in create-booking.ts. Reusing this
 * existing specialist-alert log means the unread-appointments badge needs
 * no separate event table of its own.
 */
const GUEST_INITIATED_ALERT_TYPES: NotificationType[] = ["new_booking_alert", "cancellation", "reschedule_alert"];

/**
 * Count of guest-initiated appointment events since the specialist last
 * viewed the Appointments page — drives the dashboard nav badge. A null
 * `appointmentsLastViewedAt` (never visited) counts everything.
 */
export async function getUnviewedAppointmentEventsCount(
  specialist: Pick<Specialist, "id" | "appointmentsLastViewedAt">,
): Promise<number> {
  return prisma.notificationLog.count({
    where: {
      type: { in: GUEST_INITIATED_ALERT_TYPES },
      appointment: { specialistId: specialist.id },
      ...(specialist.appointmentsLastViewedAt ? { createdAt: { gt: specialist.appointmentsLastViewedAt } } : {}),
    },
  });
}
