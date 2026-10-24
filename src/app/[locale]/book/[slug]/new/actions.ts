"use server";

import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getSlotsForDate, findEarliestAvailable, getDayAvailability } from "@/lib/booking/slots";
import type { DayAvailability } from "@/lib/booking/day-availability";
import { createGuestBooking } from "@/lib/booking/create-booking";
import { normalizePhone } from "@/lib/phone";
import { getVisitHistoryForClient } from "@/lib/clients/visit-history";
import { computeLoyaltyProgress } from "@/lib/loyalty/progress";
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

/** Day-by-day availability (open / day off / fully booked) for the popup's 14-day strip. Read-only, same public scoping as getSlotsForDateAction. */
export async function getDayAvailabilityAction(
  specialistId: string,
  serviceId: string,
  fromDateStr?: string,
): Promise<{ todayDateStr: string; days: DayAvailability[] } | null> {
  const loaded = await loadPublicSpecialistService(specialistId, serviceId);
  if (!loaded) return null;
  return getDayAvailability(loaded.specialist, loaded.service.durationMinutes, fromDateStr);
}

export type LoyaltyProgressResult = { visitNumber: number; remaining: number; rewardText: string };

// Live lookup as the guest types their phone (BookingWizard calls this
// on blur) — shown only if the specialist has loyalty enabled
// (src/app/[locale]/dashboard/loyalty). Returns null whenever there's
// nothing to show: unparseable phone, no program configured, or disabled.
export async function getLoyaltyProgressAction(
  specialistId: string,
  rawPhone: string,
): Promise<LoyaltyProgressResult | null> {
  const phoneResult = normalizePhone(rawPhone);
  if ("error" in phoneResult) return null;

  const loyaltyProgram = await prisma.loyaltyProgram.findUnique({ where: { specialistId } });
  if (!loyaltyProgram || !loyaltyProgram.enabled) return null;

  const history = await getVisitHistoryForClient(specialistId, phoneResult.phone);
  const visitNumber = (history?.visitCount ?? 0) + 1;
  const { remaining } = computeLoyaltyProgress(loyaltyProgram.ruleType, loyaltyProgram.threshold, visitNumber);

  return { visitNumber, remaining, rewardText: loyaltyProgram.rewardText };
}

export type BookingFormState = {
  fieldErrors?: BookingFieldErrors;
  formError?: BookingErrorCode;
  /** Set only by createBookingInPlaceAction, on success. */
  bookingToken?: string;
};

type SubmitResult = { ok: true; bookingToken: string; locale: AppLocale } | { ok: false; state: BookingFormState };

// Shared by the full-page wizard (which redirects to the manage page) and the
// popup (which shows its own Confirmed step). Both go through the one
// createGuestBooking, so validation, the availability re-check, the
// appointment insert and every queued notification (guest confirmation email,
// reminders, barber alert) are identical.
async function submitBooking(formData: FormData): Promise<SubmitResult> {
  const locale = (await getLocale()) as AppLocale;

  const specialistId = String(formData.get("specialistId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const startAtRaw = String(formData.get("startAt") ?? "");
  const startAt = new Date(startAtRaw);

  if (!specialistId || !serviceId || !startAtRaw || Number.isNaN(startAt.getTime())) {
    return { ok: false, state: { formError: "slotInvalid" } };
  }

  const result = await createGuestBooking({
    specialistId,
    serviceId,
    startAt,
    guestName: String(formData.get("guestName") ?? ""),
    guestPhone: String(formData.get("guestPhone") ?? ""),
    guestEmail: String(formData.get("guestEmail") ?? ""),
    guestNotes: String(formData.get("guestNotes") ?? ""),
    guestLocale: locale,
  });

  if (!result.ok) {
    return { ok: false, state: { fieldErrors: result.fieldErrors, formError: result.formError } };
  }
  return { ok: true, bookingToken: result.data.bookingToken, locale };
}

export async function createBookingAction(
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const result = await submitBooking(formData);
  if (!result.ok) return result.state;

  return redirect({ href: `/booking/${result.bookingToken}?justBooked=1`, locale: result.locale });
}

/** Popup variant: same booking, but returns the token so the popup can show its Confirmed step instead of navigating away. */
export async function createBookingInPlaceAction(
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const result = await submitBooking(formData);
  if (!result.ok) return result.state;
  return { bookingToken: result.bookingToken };
}
