/**
 * Error/validation codes for the guest-booking and appointment-management
 * server actions, following the same code-not-message convention as
 * src/lib/auth/errors.ts and src/lib/dashboard/errors.ts: the UI maps each
 * code to a string via next-intl's `Booking.errors` namespace.
 */
export type BookingErrorCode =
  | "serviceRequired"
  | "serviceNotFound"
  | "dateRequired"
  | "dateInvalid"
  | "slotRequired"
  | "slotInvalid"
  | "slotTaken"
  | "nameRequired"
  | "nameTooLong"
  | "phoneRequired"
  | "phoneInvalid"
  | "emailInvalid"
  | "notesTooLong"
  | "notFound"
  | "alreadyCancelled"
  | "generic";

export type BookingFieldErrors<K extends string = string> = Partial<Record<K, BookingErrorCode>>;

export type BookingActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors?: BookingFieldErrors; formError?: BookingErrorCode };
