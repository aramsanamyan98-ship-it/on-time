"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { StarRating } from "@/components/StarRating";
import type { ManageBookingState, ReviewFormState } from "./actions";

type AppointmentSummary = {
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  serviceName: string;
  durationMinutes: number;
  priceAmd: number;
  // Pre-formatted server-side, not `startAt` reformatted here — see the
  // comment in AppointmentRow.tsx for why: Intl.DateTimeFormat re-run in
  // this client component during hydration can disagree with the server's
  // output for less-common locales, causing a hydration mismatch.
  formattedDateTime: string;
  guestName: string;
  specialistName: string;
  timezone: string;
};

type SubmittedReview = { rating: number; comment: string | null };

const initialState: ManageBookingState = {};
const initialReviewState: ReviewFormState = {};

export function ManageBooking({
  token,
  appointment,
  locale,
  justBooked,
  justCancelled,
  justRescheduled,
  initialDateStr,
  getSlotsForDateAction,
  getEarliestAvailableAction,
  cancelBookingAction,
  rescheduleBookingAction,
  canReview,
  initialReview,
  submitReviewAction,
}: {
  token: string;
  appointment: AppointmentSummary;
  locale: string;
  justBooked: boolean;
  justCancelled: boolean;
  justRescheduled: boolean;
  initialDateStr: string;
  getSlotsForDateAction: (token: string, dateStr: string) => Promise<{ isWorkingDay: boolean; slots: string[] }>;
  getEarliestAvailableAction: (token: string) => Promise<{ dateStr: string; slot: string } | null>;
  cancelBookingAction: (prevState: ManageBookingState, formData: FormData) => Promise<ManageBookingState>;
  rescheduleBookingAction: (prevState: ManageBookingState, formData: FormData) => Promise<ManageBookingState>;
  /** 08_Roadmap.md Phase 9: whether the appointment has passed (and wasn't cancelled) — see src/lib/reviews/eligibility.ts. */
  canReview: boolean;
  initialReview: SubmittedReview | null;
  submitReviewAction: (prevState: ReviewFormState, formData: FormData) => Promise<ReviewFormState>;
}) {
  const t = useTranslations("Booking");
  const tServices = useTranslations("Services");
  const tErrors = useTranslations("Booking.errors");

  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [cancelState, cancelAction, isCancelling] = useActionState(cancelBookingAction, initialState);
  const [rescheduleState, rescheduleFormAction, isRescheduling] = useActionState(
    rescheduleBookingAction,
    initialState,
  );
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewState, reviewFormAction, isSubmittingReview] = useActionState(
    submitReviewAction,
    initialReviewState,
  );

  // Safe to format client-side: `slotIso` is only ever set from a client
  // interaction (picking a reschedule slot) after hydration, so this text
  // never has to match anything the server rendered.
  const slotFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: appointment.timezone,
  });

  if (appointment.status === "cancelled") {
    return (
      <div className="panel flex max-w-lg flex-col gap-3">
        <p className="font-medium text-brand-charcoal">{t("alreadyCancelledTitle")}</p>
        <p className="body-text text-sm">{t("alreadyCancelledMessage")}</p>
      </div>
    );
  }

  // Once submitted (this load, or a prior visit via initialReview), the
  // form never shows again — reviews are one-shot, no editing
  // (08_Roadmap.md Phase 9).
  const submittedReview: SubmittedReview | null =
    initialReview ??
    (reviewState.success ? { rating: reviewState.submittedRating ?? 0, comment: reviewState.submittedComment ?? null } : null);

  return (
    <div className="flex max-w-lg flex-col gap-6">
      {justBooked && (
        <p role="status" className="rounded-md bg-brand-green/10 px-4 py-3 text-sm font-medium text-brand-green">
          {t("bookingSuccess")}
        </p>
      )}
      {justRescheduled && (
        <p role="status" className="rounded-md bg-brand-green/10 px-4 py-3 text-sm font-medium text-brand-green">
          {t("rescheduleSuccess")}
        </p>
      )}
      {justCancelled && (
        <p role="status" className="rounded-md bg-brand-charcoal/5 px-4 py-3 text-sm text-brand-charcoal">
          {t("cancelSuccess")}
        </p>
      )}

      <div className="panel flex flex-col gap-2">
        <p className="text-sm text-brand-charcoal/60">{t("withSpecialist", { name: appointment.specialistName })}</p>
        <p className="text-lg font-semibold text-brand-charcoal">{appointment.serviceName}</p>
        <p className="text-brand-charcoal">{appointment.formattedDateTime}</p>
        <p className="body-text text-sm">
          {tServices("durationValue", { minutes: appointment.durationMinutes })} ·{" "}
          {tServices("priceValue", { price: appointment.priceAmd })}
        </p>
      </div>

      {mode === "view" && (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setMode("reschedule")} className="btn-primary">
            {t("reschedule")}
          </button>
          <form
            action={cancelAction}
            onSubmit={(event) => {
              if (!window.confirm(t("confirmCancel"))) event.preventDefault();
            }}
          >
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              disabled={isCancelling}
              className="rounded-md border border-brand-charcoal/20 px-4 py-2 text-sm font-medium text-red-700 transition hover:border-red-700 hover:bg-red-50 disabled:opacity-40"
            >
              {isCancelling ? t("cancelling") : t("cancel")}
            </button>
          </form>
        </div>
      )}
      {cancelState.formError && (
        <p role="alert" className="text-sm text-red-700">
          {tErrors(cancelState.formError)}
        </p>
      )}

      {mode === "reschedule" && (
        <form action={rescheduleFormAction} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="startAt" value={slotIso ?? ""} />

          <SlotPicker
            initialDateStr={initialDateStr}
            timezone={appointment.timezone}
            locale={locale}
            getSlots={(dateStr) => getSlotsForDateAction(token, dateStr)}
            getEarliest={() => getEarliestAvailableAction(token)}
            onSelect={setSlotIso}
            selectedSlot={slotIso}
          />

          {slotIso && (
            <p className="body-text text-sm">
              {t("newTimePreview", { time: slotFormatter.format(new Date(slotIso)) })}
            </p>
          )}

          {rescheduleState.formError && (
            <p role="alert" className="text-sm text-red-700">
              {tErrors(rescheduleState.formError)}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!slotIso || isRescheduling}
              className="btn-accent w-fit"
            >
              {isRescheduling ? t("confirming") : t("confirmReschedule")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("view");
                setSlotIso(null);
              }}
              className="btn-outline w-fit"
            >
              {t("keepOriginalTime")}
            </button>
          </div>
        </form>
      )}

      {canReview && (
        <div className="panel flex flex-col gap-3">
          <p className="font-semibold text-brand-charcoal">{t("reviewTitle")}</p>
          {submittedReview ? (
            <div className="flex flex-col gap-2">
              <p className="body-text text-sm">{t("reviewThanks")}</p>
              <StarRating value={submittedReview.rating} className="text-xl" ariaLabel={t("ratingAriaLabel", { rating: submittedReview.rating })} />
              {submittedReview.comment && (
                <p className="body-text text-sm italic">&ldquo;{submittedReview.comment}&rdquo;</p>
              )}
            </div>
          ) : (
            <form action={reviewFormAction} className="flex flex-col gap-3">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="rating" value={selectedRating} />
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedRating(star)}
                    aria-label={t("ratingStarLabel", { star })}
                    aria-pressed={star <= selectedRating}
                    className="text-2xl leading-none"
                  >
                    <span className={star <= selectedRating ? "text-brand-gold" : "text-brand-charcoal/20"}>★</span>
                  </button>
                ))}
              </div>
              {reviewState.fieldErrors?.rating && (
                <p role="alert" className="text-sm text-red-700">
                  {tErrors(reviewState.fieldErrors.rating)}
                </p>
              )}

              <textarea
                name="comment"
                rows={3}
                maxLength={1000}
                placeholder={t("reviewCommentPlaceholder")}
                className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
              />
              {reviewState.fieldErrors?.comment && (
                <p role="alert" className="text-sm text-red-700">
                  {tErrors(reviewState.fieldErrors.comment)}
                </p>
              )}

              {reviewState.formError && (
                <p role="alert" className="text-sm text-red-700">
                  {tErrors(reviewState.formError)}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmittingReview || selectedRating === 0}
                className="btn-accent w-fit"
              >
                {isSubmittingReview ? t("submittingReview") : t("submitReview")}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
