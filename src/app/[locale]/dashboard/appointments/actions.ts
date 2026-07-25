"use server";

import { getLocale } from "next-intl/server";
import { getSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { cancelAppointment } from "@/lib/booking/cancel-booking";
import { rescheduleAppointment } from "@/lib/booking/reschedule-booking";
import { getSlotsForDate, findEarliestAvailable } from "@/lib/booking/slots";
import { createManualBooking } from "@/lib/booking/create-manual-booking";
import type { AppLocale } from "@/i18n/routing";
import type { BookingErrorCode, BookingFieldErrors } from "@/lib/booking/errors";

export type AppointmentActionState = {
  fieldErrors?: BookingFieldErrors;
  formError?: BookingErrorCode;
};

async function loadOwnedAppointment(specialistId: string, appointmentId: string) {
  return prisma.appointment.findFirst({
    where: { id: appointmentId, specialistId },
    include: { specialist: true, service: true },
  });
}

async function loadActiveSpecialist(specialistId: string) {
  const specialist = await prisma.specialist.findUnique({ where: { id: specialistId } });
  if (!specialist || !specialist.emailVerifiedAt || specialist.deletedAt) return null;
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

  const result = await cancelAppointment(appointment);
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
  });
  if (!result.ok) return { fieldErrors: result.fieldErrors, formError: result.formError };

  return redirect({ href: "/dashboard/appointments?added=1", locale });
}
