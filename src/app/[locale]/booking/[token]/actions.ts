"use server";

import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getSlotsForDate, findEarliestAvailable } from "@/lib/booking/slots";
import { cancelAppointment } from "@/lib/booking/cancel-booking";
import { rescheduleAppointment } from "@/lib/booking/reschedule-booking";
import { rebookAppointment } from "@/lib/booking/rebook-booking";
import { submitReview } from "@/lib/reviews/submit-review";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { BookingErrorCode } from "@/lib/booking/errors";
import type { ReviewErrorCode, ReviewFieldErrors } from "@/lib/reviews/errors";

function loadAppointmentByToken(token: string) {
  return prisma.appointment.findUnique({
    where: { bookingToken: token },
    include: { specialist: true, service: true },
  });
}

// Shared read-only slot lookup for both an active appointment's reschedule
// and a cancelled appointment's rebooking-assist flow (same slot-picker,
// same underlying availability — a cancelled appointment never occupies a
// slot itself, see loadBusyRanges in slots.ts) — so unlike the mutating
// actions below, these don't gate on `status`.
export async function getRescheduleSlotsAction(
  token: string,
  dateStr: string,
): Promise<{ isWorkingDay: boolean; slots: string[] }> {
  const appointment = await loadAppointmentByToken(token);
  if (!appointment) return { isWorkingDay: false, slots: [] };

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
  if (!appointment) return null;

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

  const result = await cancelAppointment(appointment, appointment.specialist, "guest");
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
    "guest",
  );
  if (!result.ok) return { formError: result.formError };

  return redirect({ href: `/booking/${token}?rescheduled=1`, locale });
}

/**
 * Rebooking-assist feature: the guest picking a new time for an
 * appointment the specialist already cancelled — see
 * src/lib/booking/rebook-booking.ts. Reached from the same manage-booking
 * page as rescheduleBookingAction above (and the same rebooking_notice
 * email link), just with the appointment in "cancelled" status instead of
 * "confirmed".
 */
export async function rebookBookingAction(
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

  const result = await rebookAppointment(
    appointment,
    appointment.specialist,
    appointment.service.durationMinutes,
    startAt,
  );
  if (!result.ok) return { formError: result.formError };

  return redirect({ href: `/booking/${token}?rebooked=1`, locale });
}

export type ReviewFormState = {
  fieldErrors?: ReviewFieldErrors<"rating" | "comment">;
  formError?: ReviewErrorCode;
  success?: boolean;
  submittedRating?: number;
  submittedComment?: string | null;
};

/**
 * 08_Roadmap.md Phase 9: no redirect on success (unlike cancel/reschedule
 * above) — the form swaps in place for a "thanks for your review" state
 * using the just-submitted rating/comment, since there's nothing else on
 * this page that needs a fresh server render to reflect.
 */
export async function submitReviewAction(
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const token = String(formData.get("token") ?? "");
  const rating = Number(formData.get("rating") ?? "0");
  const comment = String(formData.get("comment") ?? "");

  const result = await submitReview(token, rating, comment);
  if (!result.ok) return { fieldErrors: result.fieldErrors, formError: result.formError };

  return { success: true, submittedRating: result.data.rating, submittedComment: result.data.comment };
}
