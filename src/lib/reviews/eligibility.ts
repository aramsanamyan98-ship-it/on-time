import type { Appointment } from "@/generated/prisma/client";

/**
 * A guest can review an appointment once it's actually over and it was
 * never cancelled (08_Roadmap.md Phase 9 / 02_PRD.md Section 14). There's
 * no "completed"/"no_show" status transition wired up anywhere in the app
 * (see AppointmentStatus in prisma/schema.prisma) — every real appointment
 * sits at "confirmed" or "cancelled" — so "has the appointment passed" is
 * a time comparison against `endAt`, not a status check.
 */
export function isAppointmentReviewable(appointment: Pick<Appointment, "status" | "endAt">): boolean {
  return appointment.status !== "cancelled" && appointment.endAt.getTime() <= Date.now();
}
