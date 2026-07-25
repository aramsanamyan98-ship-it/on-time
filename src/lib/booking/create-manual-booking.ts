import { prisma } from "@/lib/prisma";
import { isSlotAvailable } from "@/lib/booking/slots";
import { validateGuestDetails } from "@/lib/booking/validation";
import { generateUniqueBookingToken } from "@/lib/booking/token";
import { isSlotConflictError } from "@/lib/booking/conflict-error";
import type { BookingActionResult } from "@/lib/booking/errors";
import type { Appointment, Specialist } from "@/generated/prisma/client";

export type CreateManualBookingInput = {
  specialist: Specialist;
  serviceId: string;
  startAt: Date;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestNotes: string;
};

/**
 * Specialist-side counterpart to createGuestBooking (walk-in/phone bookings,
 * 04_User_Flows.md Flow 3 / 08_Roadmap.md Phase 5) kept as a separate
 * function rather than a modification to that Phase 4 file, but built on
 * the exact same availability check and DB exclusion-constraint backstop —
 * "the same double-booking prevention as guest bookings" applies here
 * unchanged, only the resulting `source` differs.
 */
export async function createManualBooking(
  input: CreateManualBookingInput,
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

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, specialistId: input.specialist.id, isActive: true },
  });
  if (!service) return { ok: false, formError: "serviceNotFound" };

  const available = await isSlotAvailable(input.specialist, service.durationMinutes, input.startAt);
  if (!available) return { ok: false, formError: "slotTaken" };

  const endAt = new Date(input.startAt.getTime() + service.durationMinutes * 60_000);
  const bookingToken = await generateUniqueBookingToken();

  try {
    const appointment = await prisma.appointment.create({
      data: {
        specialistId: input.specialist.id,
        serviceId: service.id,
        startAt: input.startAt,
        endAt,
        guestName: input.guestName.trim(),
        guestPhone: input.guestPhone.trim(),
        guestEmail: input.guestEmail.trim() || null,
        guestNotes: input.guestNotes.trim() || null,
        source: "manual_specialist_entry",
        bookingToken,
      },
    });
    return { ok: true, data: appointment };
  } catch (err) {
    // Same race-condition backstop as createGuestBooking: the specialist's
    // own calendar could itself have just been booked into by a guest.
    if (isSlotConflictError(err)) return { ok: false, formError: "slotTaken" };
    throw err;
  }
}
