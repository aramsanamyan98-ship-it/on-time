import { prisma } from "@/lib/prisma";
import { isSlotAvailable } from "@/lib/booking/slots";
import { validateGuestDetails } from "@/lib/booking/validation";
import { generateUniqueBookingToken } from "@/lib/booking/token";
import { isSlotConflictError } from "@/lib/booking/conflict-error";
import { enqueueBookingNotifications, enqueueNewBookingAlert } from "@/lib/notifications/queue";
import { routingLocaleToLanguage } from "@/lib/locale";
import type { BookingActionResult } from "@/lib/booking/errors";
import type { Appointment } from "@/generated/prisma/client";
import type { AppLocale } from "@/i18n/routing";

export type CreateGuestBookingInput = {
  specialistId: string;
  serviceId: string;
  startAt: Date;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestNotes: string;
  guestLocale: AppLocale;
};

export async function createGuestBooking(
  input: CreateGuestBookingInput,
): Promise<BookingActionResult<Appointment>> {
  const fieldErrors = validateGuestDetails({
    name: input.guestName,
    phone: input.guestPhone,
    email: input.guestEmail,
    notes: input.guestNotes,
  });
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // Re-fetched server-side rather than trusted from the client: the guest
  // wizard only ever sends IDs, but a specialist could deactivate/delete
  // their account or a service between page load and submit.
  const specialist = await prisma.specialist.findUnique({ where: { id: input.specialistId } });
  if (!specialist || !specialist.emailVerifiedAt || specialist.deletedAt) {
    return { ok: false, formError: "notFound" };
  }

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, specialistId: input.specialistId, isActive: true },
  });
  if (!service) return { ok: false, formError: "serviceNotFound" };

  const available = await isSlotAvailable(specialist, service.durationMinutes, input.startAt);
  if (!available) return { ok: false, formError: "slotTaken" };

  const endAt = new Date(input.startAt.getTime() + service.durationMinutes * 60_000);
  const bookingToken = await generateUniqueBookingToken();

  try {
    const appointment = await prisma.appointment.create({
      data: {
        specialistId: specialist.id,
        serviceId: service.id,
        startAt: input.startAt,
        endAt,
        guestName: input.guestName.trim(),
        guestPhone: input.guestPhone.trim(),
        guestEmail: input.guestEmail.trim() || null,
        guestNotes: input.guestNotes.trim() || null,
        source: "guest_booking",
        bookingToken,
        guestLocale: routingLocaleToLanguage[input.guestLocale],
      },
    });
    await enqueueBookingNotifications(appointment);
    // Guest-initiated only — createManualBooking (Phase 5) doesn't alert
    // the specialist about their own walk-in/phone entry (02_PRD.md
    // Section 9: "New booking notification sent to specialist").
    await enqueueNewBookingAlert(appointment, specialist);
    return { ok: true, data: appointment };
  } catch (err) {
    // The pre-check above already covers the common case; this is the
    // race-condition backstop the DB constraint exists for (see
    // 04_User_Flows.md Flow 2's "near-simultaneous booking" case).
    if (isSlotConflictError(err)) return { ok: false, formError: "slotTaken" };
    throw err;
  }
}
