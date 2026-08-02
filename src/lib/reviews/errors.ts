/**
 * Error/validation codes for the guest review-submission action, following
 * the same code-not-message convention as src/lib/booking/errors.ts: the
 * UI maps each code to a string via next-intl's `Booking.errors`
 * namespace (reviews are submitted from the same booking-token page as
 * cancel/reschedule, so they share that namespace rather than starting a
 * new one).
 */
export type ReviewErrorCode =
  | "ratingRequired"
  | "ratingInvalid"
  | "commentTooLong"
  | "reviewNotEligibleYet"
  | "alreadyReviewed"
  | "notFound"
  | "generic";

export type ReviewFieldErrors<K extends string = string> = Partial<Record<K, ReviewErrorCode>>;

export type ReviewActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors?: ReviewFieldErrors; formError?: ReviewErrorCode };
