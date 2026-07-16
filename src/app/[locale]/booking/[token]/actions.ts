"use server";

import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getSlotsForDate, findEarliestAvailable } from "@/lib/booking/slots";
import { cancelAppointment } from "@/lib/booking/cancel-booking";
import { rescheduleAppointment } from "@/lib/booking/reschedule-booking";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { BookingErrorCode } from "@/lib/booking/errors";

function loadAppointmentByToken(token: string) {
  return prisma.appointment.findUnique({
    where: { bookingToken: token },
    include: { specialist: true, service: true },
  });
}

export async function getRescheduleSlotsAction(
  token: string,
  dateStr: string,
): Promise<{ isWorkingDay: boolean; slots: string[] }> {
  const appointment = await loadAppointmentByToken(token);
  if (!appointment || appointment.status === "cancelled") return { isWorkingDay: false, slots: [] };

  const { isWorkingDay, slots } = await getSlotsForDate(
    appointment.specialist,
    appointment.service.durationMinutes,
    dateStr,
    { excludeAppointmentId: appointment.id },
  );
  return { isWorkingDay, slots: slots.map((s) => s.toISOString()) };
}

export async function getRescheduleEarliestAction(
  token: string,
): Promise<{ dateStr: string; slot: string } | null> {
  const appointment = await loadAppointmentByToken(token);
  if (!appointment || appointment.status === "cancelled") return null;

  const earliest = await findEarliestAvailable(appointment.specialist, appointment.service.durationMinutes, {
    excludeAppointmentId: appointment.id,
  });
  if (!earliest) return null;
  return { dateStr: earliest.dateStr, slot: earliest.slot.toISOString() };
}

export type ManageBookingState = {
  formError?: BookingErrorCode;
};

export async function cancelBookingAction(
  _prevState: ManageBookingState,
  formData: FormData,
): Promise<ManageBookingState> {
  const token = String(formData.get("token") ?? "");
  const locale = (await getLocale()) as AppLocale;

  const appointment = await loadAppointmentByToken(token);
  if (!appointment) return { formError: "notFound" };

  const result = await cancelAppointment(appointment);
  if (!result.ok) return { formError: result.formError };

  return redirect({ href: `/booking/${token}?cancelled=1`, locale });
}

export async function rescheduleBookingAction(
  _prevState: ManageBookingState,
  formData: FormData,
): Promise<ManageBookingState> {
  const token = String(formData.get("token") ?? "");
  const locale = (await getLocale()) as AppLocale;
  const startAtRaw = String(formData.get("startAt") ?? "");
  const startAt = new Date(startAtRaw);

  const appointment = await loadAppointmentByToken(token);
  if (!appointment) return { formError: "notFound" };
  if (!startAtRaw || Number.isNaN(startAt.getTime())) return { formError: "slotInvalid" };

  const result = await rescheduleAppointment(
    appointment,
    appointment.specialist,
    appointment.service.durationMinutes,
    startAt,
  );
  if (!result.ok) return { formError: result.formError };

  return redirect({ href: `/booking/${token}?rescheduled=1`, locale });
}
