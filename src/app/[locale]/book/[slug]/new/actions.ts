"use server";

import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getSlotsForDate, findEarliestAvailable } from "@/lib/booking/slots";
import { createGuestBooking } from "@/lib/booking/create-booking";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { BookingFieldErrors, BookingErrorCode } from "@/lib/booking/errors";

async function loadPublicSpecialistService(specialistId: string, serviceId: string) {
  const [specialist, service] = await Promise.all([
    prisma.specialist.findUnique({ where: { id: specialistId } }),
    prisma.service.findFirst({ where: { id: serviceId, specialistId, isActive: true } }),
  ]);
  if (!specialist || !specialist.emailVerifiedAt || specialist.deletedAt || !service) return null;
  return { specialist, service };
}

export async function getSlotsForDateAction(
  specialistId: string,
  serviceId: string,
  dateStr: string,
): Promise<{ isWorkingDay: boolean; slots: string[] }> {
  const loaded = await loadPublicSpecialistService(specialistId, serviceId);
  if (!loaded) return { isWorkingDay: false, slots: [] };

  const { isWorkingDay, slots } = await getSlotsForDate(loaded.specialist, loaded.service.durationMinutes, dateStr);
  return { isWorkingDay, slots: slots.map((s) => s.toISOString()) };
}

export async function getEarliestAvailableAction(
  specialistId: string,
  serviceId: string,
): Promise<{ dateStr: string; slot: string } | null> {
  const loaded = await loadPublicSpecialistService(specialistId, serviceId);
  if (!loaded) return null;

  const earliest = await findEarliestAvailable(loaded.specialist, loaded.service.durationMinutes);
  if (!earliest) return null;
  return { dateStr: earliest.dateStr, slot: earliest.slot.toISOString() };
}

export type BookingFormState = {
  fieldErrors?: BookingFieldErrors;
  formError?: BookingErrorCode;
};

export async function createBookingAction(
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const locale = (await getLocale()) as AppLocale;

  const specialistId = String(formData.get("specialistId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const startAtRaw = String(formData.get("startAt") ?? "");
  const startAt = new Date(startAtRaw);

  if (!specialistId || !serviceId || !startAtRaw || Number.isNaN(startAt.getTime())) {
    return { formError: "slotInvalid" };
  }

  const result = await createGuestBooking({
    specialistId,
    serviceId,
    startAt,
    guestName: String(formData.get("guestName") ?? ""),
    guestPhone: String(formData.get("guestPhone") ?? ""),
    guestEmail: String(formData.get("guestEmail") ?? ""),
    guestNotes: String(formData.get("guestNotes") ?? ""),
  });

  if (!result.ok) {
    return { fieldErrors: result.fieldErrors, formError: result.formError };
  }

  return redirect({ href: `/booking/${result.data.bookingToken}?justBooked=1`, locale });
}
