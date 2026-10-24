"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { buildIcsContent, downloadIcsFile } from "@/lib/booking/ics";
import { formatAmount } from "@/lib/booking/public-profile";
import type { DayAvailability } from "@/lib/booking/day-availability";
import type { BookingFormState } from "./actions";
import { DateTimeStep } from "./DateTimeStep";
import { useBookingSheet } from "./BookingSheet";
import { useDateLabels } from "./date-labels";

type Service = { id: string; name: string; durationMinutes: number; priceAmd: number };
type Step = "service" | "datetime" | "details" | "confirmed";

const STEPS: Step[] = ["service", "datetime", "details", "confirmed"];
const STEP_LABEL_KEY = {
  service: "stepService",
  datetime: "stepDateTime",
  details: "stepDetails",
  confirmed: "stepConfirmed",
} as const;

const initialState: BookingFormState = {};

const inputClass =
  "min-h-11 rounded-xl border border-brand-sand bg-white px-3 text-base text-brand-charcoal focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-gold/40";

export function BookingWizard({
  specialistId,
  specialist,
  timezone,
  locale,
  services,
  todayDateStr,
  initialDateStr,
  initialServiceId,
  initialSlotIso,
  initialSlotTaken,
  getSlotsForDateAction,
  getDayAvailabilityAction,
  getEarliestAvailableAction,
  createBookingAction,
  getLoyaltyProgressAction,
}: {
  specialistId: string;
  specialist: { name: string; address: string | null };
  timezone: string;
  locale: string;
  services: Service[];
  /** The barber's calendar "today" (not the UTC date). */
  todayDateStr: string;
  initialDateStr: string;
  /** From a "ready to rebook?" email link (`?service=<id>`, see src/lib/notifications/send.ts) — pre-selects the guest's previous service and skips straight to picking a time. */
  initialServiceId?: string | null;
  /** From a "Fill my schedule" Story link or a free-time button on the profile (`&start=`, see src/lib/booking/slot-link.ts) — a start time the server just confirmed is still open; skips straight to the details step. */
  initialSlotIso?: string | null;
  /** The linked start time was taken since the link was made: open the time picker with a notice instead. */
  initialSlotTaken?: boolean;
  getSlotsForDateAction: (
    specialistId: string,
    serviceId: string,
    dateStr: string,
  ) => Promise<{ isWorkingDay: boolean; slots: string[] }>;
  getDayAvailabilityAction: (
    specialistId: string,
    serviceId: string,
    fromDateStr?: string,
  ) => Promise<{ todayDateStr: string; days: DayAvailability[] } | null>;
  getEarliestAvailableAction: (
    specialistId: string,
    serviceId: string,
  ) => Promise<{ dateStr: string; slot: string } | null>;
  /** Full page: redirects to the manage page. Popup: returns `bookingToken` and the wizard shows its own Confirmed step. */
  createBookingAction: (prevState: BookingFormState, formData: FormData) => Promise<BookingFormState>;
  getLoyaltyProgressAction: (
    specialistId: string,
    phone: string,
  ) => Promise<{ visitNumber: number; remaining: number; rewardText: string } | null>;
}) {
  const t = useTranslations("Booking");
  const tServices = useTranslations("Services");
  const tErrors = useTranslations("Booking.errors");
  const sheet = useBookingSheet();
  const labels = useDateLabels(timezone);

  const preselectedServiceId = initialServiceId ?? (services.length === 1 ? services[0].id : null);
  const preselectedSlotIso = preselectedServiceId && initialSlotIso ? initialSlotIso : null;
  const [step, setStep] = useState<Exclude<Step, "confirmed">>(
    preselectedSlotIso ? "details" : preselectedServiceId ? "datetime" : "service",
  );
  const [serviceId, setServiceId] = useState<string | null>(preselectedServiceId);
  const [slotIso, setSlotIso] = useState<string | null>(preselectedSlotIso);
  const [state, formAction, isPending] = useActionState(createBookingAction, initialState);
  // A "slot taken" error belongs to the attempt that produced it: once the
  // client goes back to pick another time, the old error must not reappear.
  const [dismissedState, setDismissedState] = useState<BookingFormState | null>(null);
  const [loyaltyProgress, setLoyaltyProgress] = useState<{
    visitNumber: number;
    remaining: number;
    rewardText: string;
  } | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [hasEmail, setHasEmail] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const confirmedToken = state.bookingToken ?? null;
  const current: Step = confirmedToken ? "confirmed" : step;
  const visibleState = state === dismissedState ? initialState : state;

  useEffect(() => {
    if (confirmedToken) sheet?.setDirty(false);
  }, [confirmedToken, sheet]);

  const formatPrice = (amount: number) => t("priceAmd", { price: formatAmount(amount) });

  function handleFormInput(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const typed = (key: string) => String(data.get(key) ?? "").trim() !== "";
    setHasEmail(typed("guestEmail"));
    sheet?.setDirty(["guestName", "guestPhone", "guestEmail", "guestNotes"].some(typed));
  }

  function goBackFromDetails(next: "service" | "datetime") {
    sheet?.setDirty(false);
    setDismissedState(state);
    setStep(next);
  }

  function manageUrl(token: string) {
    return `${window.location.origin}/${locale}/booking/${token}`;
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(manageUrl(token));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  function addToCalendar(token: string) {
    if (!selectedService || !slotIso) return;
    const startAt = new Date(slotIso);
    const ics = buildIcsContent({
      uid: `${token}@ontime.am`,
      summary: t("icsEventTitle", { service: selectedService.name, specialist: specialist.name }),
      description: t("icsEventDescription", {
        service: selectedService.name,
        specialist: specialist.name,
        duration: tServices("durationValue", { minutes: selectedService.durationMinutes }),
      }),
      location: specialist.address ?? undefined,
      startAt,
      endAt: new Date(startAt.getTime() + selectedService.durationMinutes * 60_000),
    });
    downloadIcsFile(`booking-${token}.ics`, ics);
  }

  const currentIndex = STEPS.indexOf(current);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <ol className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((name, index) => (
            <li
              key={name}
              className={`h-1.5 flex-1 rounded-full ${index <= currentIndex ? "bg-brand-green" : "bg-brand-sand"}`}
            />
          ))}
        </ol>
        <p className="text-xs font-semibold text-brand-muted">
          {t("progressLabel", {
            current: currentIndex + 1,
            total: STEPS.length,
            name: t(STEP_LABEL_KEY[current]),
          })}
        </p>
      </div>

      {current === "service" && (
        <ul className="flex flex-col gap-3">
          {services.map((service) => (
            <li key={service.id}>
              <button
                type="button"
                onClick={() => {
                  setServiceId(service.id);
                  setSlotIso(null);
                  setStep("datetime");
                }}
                className="flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl border border-brand-card-border bg-white p-4 text-left transition hover:border-brand-green"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-semibold text-brand-charcoal">{service.name}</span>
                  <span className="text-sm text-brand-muted">
                    {tServices("durationValue", { minutes: service.durationMinutes })}
                  </span>
                </span>
                <span className="whitespace-nowrap font-bold text-brand-green">{formatPrice(service.priceAmd)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {current === "datetime" && selectedService && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setStep("service")}
            className="min-h-11 w-fit text-sm font-semibold text-brand-green underline"
          >
            {t("changeService")}
          </button>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-card-border bg-white px-4 py-3 text-sm">
            <span className="font-semibold text-brand-charcoal">{selectedService.name}</span>
            <span className="whitespace-nowrap font-bold text-brand-green">{formatPrice(selectedService.priceAmd)}</span>
          </div>
          {initialSlotTaken && !slotIso && (
            <p role="status" className="rounded-xl bg-brand-gold-tint px-3 py-2 text-sm text-brand-charcoal">
              {t("linkedSlotTaken")}
            </p>
          )}
          <DateTimeStep
            key={selectedService.id}
            specialistId={specialistId}
            serviceId={selectedService.id}
            timezone={timezone}
            todayDateStr={todayDateStr}
            initialDateStr={initialDateStr}
            selectedSlot={slotIso}
            onSelect={setSlotIso}
            onContinue={() => setStep("details")}
            getDayAvailabilityAction={getDayAvailabilityAction}
            getSlotsForDateAction={getSlotsForDateAction}
            getEarliestAvailableAction={getEarliestAvailableAction}
          />
        </div>
      )}

      {current === "details" && selectedService && slotIso && (
        <form action={formAction} onInput={handleFormInput} className="flex flex-col gap-4" noValidate>
          <button
            type="button"
            onClick={() => goBackFromDetails("datetime")}
            className="min-h-11 w-fit text-sm font-semibold text-brand-green underline"
          >
            {t("changeTime")}
          </button>

          <div className="flex flex-col gap-1 rounded-2xl border border-brand-card-border bg-white p-4 text-sm">
            <p className="font-semibold text-brand-charcoal">{selectedService.name}</p>
            <p className="text-brand-muted">{labels.longDateTime(slotIso)}</p>
            <p className="font-bold text-brand-green">{formatPrice(selectedService.priceAmd)}</p>
          </div>

          <input type="hidden" name="specialistId" value={specialistId} />
          <input type="hidden" name="serviceId" value={selectedService.id} />
          <input type="hidden" name="startAt" value={slotIso} />

          <div className="flex flex-col gap-1">
            <label htmlFor="guestName" className="text-sm font-semibold text-brand-charcoal">
              {t("nameLabel")}
            </label>
            <input id="guestName" name="guestName" type="text" required autoComplete="name" className={inputClass} />
            {visibleState.fieldErrors?.name && (
              <p role="alert" className="text-sm text-red-700">
                {tErrors(visibleState.fieldErrors.name)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="guestPhone" className="text-sm font-semibold text-brand-charcoal">
              {t("phoneLabel")}
            </label>
            <input
              id="guestPhone"
              name="guestPhone"
              type="tel"
              required
              autoComplete="tel"
              onBlur={async (event) => {
                const phone = event.target.value.trim();
                if (!phone) {
                  setLoyaltyProgress(null);
                  return;
                }
                const progress = await getLoyaltyProgressAction(specialistId, phone);
                setLoyaltyProgress(progress);
              }}
              className={inputClass}
            />
            {visibleState.fieldErrors?.phone && (
              <p role="alert" className="text-sm text-red-700">
                {tErrors(visibleState.fieldErrors.phone)}
              </p>
            )}
            {loyaltyProgress && (
              <p className="rounded-xl bg-brand-gold-tint px-3 py-2 text-sm font-medium text-brand-green">
                {loyaltyProgress.remaining === 0
                  ? t("loyaltyProgressReward", { rewardText: loyaltyProgress.rewardText })
                  : t("loyaltyProgressCounting", {
                      visitNumber: loyaltyProgress.visitNumber,
                      remaining: loyaltyProgress.remaining,
                      rewardText: loyaltyProgress.rewardText,
                    })}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="guestEmail" className="text-sm font-semibold text-brand-charcoal">
              {t("emailLabel")}
            </label>
            <input id="guestEmail" name="guestEmail" type="email" autoComplete="email" className={inputClass} />
            {visibleState.fieldErrors?.email && (
              <p role="alert" className="text-sm text-red-700">
                {tErrors(visibleState.fieldErrors.email)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="guestNotes" className="text-sm font-semibold text-brand-charcoal">
              {t("notesLabel")}
            </label>
            <textarea
              id="guestNotes"
              name="guestNotes"
              rows={3}
              maxLength={500}
              className={`${inputClass} py-2`}
            />
            {visibleState.fieldErrors?.notes && (
              <p role="alert" className="text-sm text-red-700">
                {tErrors(visibleState.fieldErrors.notes)}
              </p>
            )}
          </div>

          {visibleState.formError && (
            <p role="alert" className="flex flex-wrap items-center gap-x-3 text-sm text-red-700">
              {tErrors(visibleState.formError)}
              {visibleState.formError === "slotTaken" && (
                <button
                  type="button"
                  onClick={() => {
                    setSlotIso(null);
                    goBackFromDetails("datetime");
                  }}
                  className="min-h-11 font-semibold underline"
                >
                  {t("pickAnotherTime")}
                </button>
              )}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="min-h-12 w-full rounded-xl bg-brand-gold px-5 text-base font-bold text-brand-green transition hover:bg-brand-gold-hover disabled:opacity-60"
          >
            {isPending ? t("confirming") : t("confirmBooking")}
          </button>
        </form>
      )}

      {current === "confirmed" && confirmedToken && selectedService && slotIso && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green text-brand-gold">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="5 12.5 10 17.5 19 7.5" />
              </svg>
            </span>
            <h3 role="status" className="font-serif text-2xl font-bold text-brand-green">
              {t("confirmedTitle")}
            </h3>
            <p className="text-sm text-brand-charcoal/80">{t("confirmedBody")}</p>
          </div>

          <dl className="flex flex-col gap-2 rounded-2xl border border-brand-card-border bg-white p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-brand-muted">{t("stepService")}</dt>
              <dd className="text-right font-semibold text-brand-charcoal">{selectedService.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-muted">{t("stepDateTime")}</dt>
              <dd className="text-right font-semibold text-brand-charcoal">{labels.longDateTime(slotIso)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-muted">{t("priceLabel")}</dt>
              <dd className="text-right font-bold text-brand-green">{formatPrice(selectedService.priceAmd)}</dd>
            </div>
          </dl>

          {hasEmail && <p className="text-center text-xs text-brand-muted">{t("confirmedEmailNote")}</p>}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => addToCalendar(confirmedToken)}
              className="min-h-12 w-full rounded-xl border border-brand-sand bg-white px-4 text-sm font-semibold text-brand-charcoal transition hover:border-brand-green"
            >
              {t("addToCalendar")}
            </button>
            <button
              type="button"
              onClick={() => copyLink(confirmedToken)}
              className="min-h-12 w-full rounded-xl border border-brand-sand bg-white px-4 text-sm font-semibold text-brand-charcoal transition hover:border-brand-green"
            >
              {t("copyLink")}
            </button>
            <p role="status" className="min-h-5 text-center text-xs text-brand-green">
              {copyState === "copied" ? t("linkCopied") : ""}
            </p>
            {copyState === "failed" && (
              <label className="flex flex-col gap-1 text-xs text-brand-muted">
                {t("linkCopyFailed")}
                <input
                  readOnly
                  value={manageUrl(confirmedToken)}
                  onFocus={(event) => event.currentTarget.select()}
                  className={inputClass}
                />
              </label>
            )}
            {sheet && (
              <button
                type="button"
                onClick={sheet.closeNow}
                className="min-h-12 w-full rounded-xl bg-brand-gold px-5 text-base font-bold text-brand-green transition hover:bg-brand-gold-hover"
              >
                {t("done")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
