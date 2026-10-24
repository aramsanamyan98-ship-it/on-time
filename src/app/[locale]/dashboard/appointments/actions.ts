"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { hasActiveAccess } from "@/lib/subscription/trial";
import { cancelAppointment } from "@/lib/booking/cancel-booking";
import { rescheduleAppointment } from "@/lib/booking/reschedule-booking";
import { getSlotsForDate, findEarliestAvailable } from "@/lib/booking/slots";
import { createManualBooking } from "@/lib/booking/create-manual-booking";
import { loadCalendarRange } from "@/lib/dashboard/calendar-data";
import { canMarkOutcome, parseCalendarRange, type CalendarRangeData } from "@/lib/dashboard/calendar";
import type { AppLocale } from "@/i18n/routing";
import type { BookingErrorCode, BookingFieldErrors } from "@/lib/booking/errors";

export type AppointmentActionState = {
  fieldErrors?: BookingFieldErrors;
  formError?: BookingErrorCode;
};

// 02_PRD.md Section 14: every dashboard action requires an active trial or
// subscription. The layout already blocks the dashboard UI for anyone
// without it; these loaders re-check server-side since a server action is
// directly callable, so a lapsed specialist gets the same "not found" /
// "generic" result as any other unusable session.
async function loadOwnedAppointment(specialistId: string, appointmentId: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, specialistId },
    include: { specialist: true, service: true },
  });
  if (!appointment || !hasActiveAccess(appointment.specialist)) return null;
  return appointment;
}

async function loadActiveSpecialist(specialistId: string) {
  const specialist = await prisma.specialist.findUnique({ where: { id: specialistId } });
  if (!specialist || !specialist.emailVerifiedAt || specialist.deletedAt || !hasActiveAccess(specialist)) return null;
  return specialist;
}

async function loadOwnedService(specialistId: string, serviceId: string) {
  return prisma.service.findFirst({ where: { id: serviceId, specialistId, isActive: true } });
}

export async function cancelAppointmentAction(
  _prevState: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };
  const locale = (await getLocale()) as AppLocale;

  const appointmentId = String(formData.get("appointmentId") ?? "");
  const appointment = await loadOwnedAppointment(session.specialistId, appointmentId);
  if (!appointment) return { formError: "notFound" };

  const result = await cancelAppointment(appointment, appointment.specialist, "specialist");
  if (!result.ok) return { formError: result.formError };

  return redirect({ href: "/dashboard/appointments", locale });
}

export async function getAppointmentRescheduleSlotsAction(
  appointmentId: string,
  dateStr: string,
): Promise<{ isWorkingDay: boolean; slots: string[] }> {
  const session = await getSession();
  if (!session) return { isWorkingDay: false, slots: [] };

  const appointment = await loadOwnedAppointment(session.specialistId, appointmentId);
  if (!appointment || appointment.status === "cancelled") return { isWorkingDay: false, slots: [] };

  const { isWorkingDay, slots } = await getSlotsForDate(
    appointment.specialist,
    appointment.service.durationMinutes,
    dateStr,
    { excludeAppointmentId: appointment.id },
  );
  return { isWorkingDay, slots: slots.map((s) => s.toISOString()) };
}

export async function getAppointmentRescheduleEarliestAction(
  appointmentId: string,
): Promise<{ dateStr: string; slot: string } | null> {
  const session = await getSession();
  if (!session) return null;

  const appointment = await loadOwnedAppointment(session.specialistId, appointmentId);
  if (!appointment || appointment.status === "cancelled") return null;

  const earliest = await findEarliestAvailable(appointment.specialist, appointment.service.durationMinutes, {
    excludeAppointmentId: appointment.id,
  });
  if (!earliest) return null;
  return { dateStr: earliest.dateStr, slot: earliest.slot.toISOString() };
}

export async function rescheduleAppointmentAction(
  _prevState: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };
  const locale = (await getLocale()) as AppLocale;

  const appointmentId = String(formData.get("appointmentId") ?? "");
  const startAtRaw = String(formData.get("startAt") ?? "");
  const startAt = new Date(startAtRaw);

  const appointment = await loadOwnedAppointment(session.specialistId, appointmentId);
  if (!appointment) return { formError: "notFound" };
  if (!startAtRaw || Number.isNaN(startAt.getTime())) return { formError: "slotInvalid" };

  const result = await rescheduleAppointment(
    appointment,
    appointment.specialist,
    appointment.service.durationMinutes,
    startAt,
    "specialist",
  );
  if (!result.ok) return { formError: result.formError };

  return redirect({ href: "/dashboard/appointments", locale });
}

// Manual appointment entry (walk-in/phone booking) — 04_User_Flows.md
// Flow 3, 08_Roadmap.md Phase 5. Scoped by the logged-in specialist's own
// session rather than a client-supplied specialistId, the same trust
// boundary `loadOwnedAppointment` already applies to reschedule/cancel.

export async function getManualBookingSlotsAction(
  serviceId: string,
  dateStr: string,
): Promise<{ isWorkingDay: boolean; slots: string[] }> {
  const session = await getSession();
  if (!session) return { isWorkingDay: false, slots: [] };

  const specialist = await loadActiveSpecialist(session.specialistId);
  const service = specialist && (await loadOwnedService(specialist.id, serviceId));
  if (!specialist || !service) return { isWorkingDay: false, slots: [] };

  const { isWorkingDay, slots } = await getSlotsForDate(specialist, service.durationMinutes, dateStr);
  return { isWorkingDay, slots: slots.map((s) => s.toISOString()) };
}

export async function getManualBookingEarliestAction(
  serviceId: string,
): Promise<{ dateStr: string; slot: string } | null> {
  const session = await getSession();
  if (!session) return null;

  const specialist = await loadActiveSpecialist(session.specialistId);
  const service = specialist && (await loadOwnedService(specialist.id, serviceId));
  if (!specialist || !service) return null;

  const earliest = await findEarliestAvailable(specialist, service.durationMinutes);
  if (!earliest) return null;
  return { dateStr: earliest.dateStr, slot: earliest.slot.toISOString() };
}

export async function createManualAppointmentAction(
  _prevState: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };
  const locale = (await getLocale()) as AppLocale;

  const specialist = await loadActiveSpecialist(session.specialistId);
  if (!specialist) return { formError: "generic" };

  const serviceId = String(formData.get("serviceId") ?? "");
  const startAtRaw = String(formData.get("startAt") ?? "");
  const startAt = new Date(startAtRaw);
  if (!serviceId) return { formError: "serviceRequired" };
  if (!startAtRaw || Number.isNaN(startAt.getTime())) return { formError: "slotInvalid" };

  const result = await createManualBooking({
    specialist,
    serviceId,
    startAt,
    guestName: String(formData.get("guestName") ?? ""),
    guestPhone: String(formData.get("guestPhone") ?? ""),
    guestEmail: String(formData.get("guestEmail") ?? ""),
    guestNotes: String(formData.get("guestNotes") ?? ""),
    // No separate guest-language picker in the manual-entry form — the
    // specialist's own active dashboard locale is the closest available
    // signal for a walk-in/phone booking they're entering themselves.
    guestLocale: locale,
  });
  if (!result.ok) return { fieldErrors: result.fieldErrors, formError: result.formError };

  return redirect({ href: "/dashboard/appointments?added=1", locale });
}

// Calendar view (Appointments tab). Both are scoped by the logged-in
// specialist's own session, same trust boundary as the actions above.

/** Read-only: bookings + blocked time overlapping the calendar's visible range. */
export async function getCalendarRangeAction(fromIso: string, toIso: string): Promise<CalendarRangeData | null> {
  const session = await getSession();
  if (!session) return null;
  const specialist = await loadActiveSpecialist(session.specialistId);
  if (!specialist) return null;

  const range = parseCalendarRange(fromIso, toIso);
  if (!range) return null;
  return loadCalendarRange(specialist.id, range.from, range.to);
}

export type AppointmentOutcomeResult = { ok: true } | { ok: false; error: "notFound" | "notEnded" | "invalid" };

/**
 * Marks an ended booking completed or no-show. Also used to switch between
 * the two after a mistake, so any non-cancelled, already-ended booking is
 * accepted. Not a <form> action: the calendar dialog calls it directly and
 * refetches the visible range instead of redirecting.
 */
export async function setAppointmentOutcomeAction(
  appointmentId: string,
  outcome: string,
): Promise<AppointmentOutcomeResult> {
  if (outcome !== "completed" && outcome !== "no_show") return { ok: false, error: "invalid" };

  const session = await getSession();
  if (!session) return { ok: false, error: "notFound" };

  const appointment = await loadOwnedAppointment(session.specialistId, String(appointmentId));
  if (!appointment) return { ok: false, error: "notFound" };
  if (!canMarkOutcome(appointment.status, appointment.endAt)) {
    return { ok: false, error: appointment.status === "cancelled" ? "invalid" : "notEnded" };
  }

  await prisma.appointment.update({ where: { id: appointment.id }, data: { status: outcome } });
  return { ok: true };
}

/**
 * Called once when the Appointments page mounts (see
 * MarkAppointmentsViewed.tsx) to clear the dashboard nav's unread badge
 * (src/lib/dashboard/appointments-badge.ts). Not a <form> action — fired
 * automatically on page view rather than a user click, so there's no
 * useActionState/redirect ceremony here, just the write plus a
 * revalidation so the nav (rendered by the shared dashboard layout, which
 * App Router doesn't otherwise re-render on a same-layout navigation)
 * picks up the cleared count without a full page reload.
 */
export async function markAppointmentsViewedAction(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  if (!(await loadActiveSpecialist(session.specialistId))) return;

  await prisma.specialist.update({
    where: { id: session.specialistId },
    data: { appointmentsLastViewedAt: new Date() },
  });
  // The literal dynamic-segment template (matching the layout's filesystem
  // path), not a resolved locale — required by revalidatePath for `type:
  // "layout"` so it revalidates the layout for every locale, not one path.
  revalidatePath("/[locale]/dashboard", "layout");
}
