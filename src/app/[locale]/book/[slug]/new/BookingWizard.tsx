"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { SlotPicker } from "@/components/booking/SlotPicker";
import type { BookingFormState } from "./actions";

type Service = { id: string; name: string; durationMinutes: number; priceAmd: number };

const initialState: BookingFormState = {};

export function BookingWizard({
  specialistId,
  timezone,
  locale,
  services,
  initialDateStr,
  getSlotsForDateAction,
  getEarliestAvailableAction,
  createBookingAction,
}: {
  specialistId: string;
  timezone: string;
  locale: string;
  services: Service[];
  initialDateStr: string;
  getSlotsForDateAction: (
    specialistId: string,
    serviceId: string,
    dateStr: string,
  ) => Promise<{ isWorkingDay: boolean; slots: string[] }>;
  getEarliestAvailableAction: (
    specialistId: string,
    serviceId: string,
  ) => Promise<{ dateStr: string; slot: string } | null>;
  createBookingAction: (prevState: BookingFormState, formData: FormData) => Promise<BookingFormState>;
}) {
  const t = useTranslations("Booking");
  const tServices = useTranslations("Services");
  const tErrors = useTranslations("Booking.errors");

  const [step, setStep] = useState<"service" | "datetime" | "details">("service");
  const [serviceId, setServiceId] = useState<string | null>(services.length === 1 ? services[0].id : null);
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(createBookingAction, initialState);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  const slotFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <ol className="flex items-center gap-2 text-xs font-medium text-brand-charcoal/50">
        <li className={step === "service" ? "text-brand-green" : undefined}>{t("stepService")}</li>
        <li aria-hidden>&rsaquo;</li>
        <li className={step === "datetime" ? "text-brand-green" : undefined}>{t("stepDateTime")}</li>
        <li aria-hidden>&rsaquo;</li>
        <li className={step === "details" ? "text-brand-green" : undefined}>{t("stepDetails")}</li>
      </ol>

      {step === "service" && (
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => {
                setServiceId(service.id);
                setSlotIso(null);
                setStep("datetime");
              }}
              className="flex items-center justify-between gap-4 rounded-lg border border-brand-charcoal/10 px-4 py-3 text-left transition hover:border-brand-gold"
            >
              <span className="font-medium text-brand-charcoal">{service.name}</span>
              <span className="whitespace-nowrap text-sm text-brand-charcoal/70">
                {tServices("durationValue", { minutes: service.durationMinutes })} ·{" "}
                {tServices("priceValue", { price: service.priceAmd })}
              </span>
            </button>
          ))}
        </div>
      )}

      {step === "datetime" && selectedService && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setStep("service")}
            className="w-fit text-sm text-brand-charcoal/60 underline"
          >
            {t("changeService")}
          </button>
          <SlotPicker
            initialDateStr={initialDateStr}
            timezone={timezone}
            locale={locale}
            getSlots={(dateStr) => getSlotsForDateAction(specialistId, selectedService.id, dateStr)}
            getEarliest={() => getEarliestAvailableAction(specialistId, selectedService.id)}
            onSelect={setSlotIso}
            selectedSlot={slotIso}
          />
          <button
            type="button"
            disabled={!slotIso}
            onClick={() => setStep("details")}
            className="w-fit rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {t("continue")}
          </button>
        </div>
      )}

      {step === "details" && selectedService && slotIso && (
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <button
            type="button"
            onClick={() => setStep("datetime")}
            className="w-fit text-sm text-brand-charcoal/60 underline"
          >
            {t("changeTime")}
          </button>

          <div className="rounded-lg border border-brand-charcoal/10 px-4 py-3 text-sm text-brand-charcoal">
            <p className="font-medium">{selectedService.name}</p>
            <p className="text-brand-charcoal/70">{slotFormatter.format(new Date(slotIso))}</p>
          </div>

          <input type="hidden" name="specialistId" value={specialistId} />
          <input type="hidden" name="serviceId" value={selectedService.id} />
          <input type="hidden" name="startAt" value={slotIso} />

          <div className="flex flex-col gap-1">
            <label htmlFor="guestName" className="text-sm font-medium text-brand-charcoal">
              {t("nameLabel")}
            </label>
            <input
              id="guestName"
              name="guestName"
              type="text"
              required
              className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
            />
            {state.fieldErrors?.name && (
              <p role="alert" className="text-sm text-red-700">
                {tErrors(state.fieldErrors.name)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="guestPhone" className="text-sm font-medium text-brand-charcoal">
              {t("phoneLabel")}
            </label>
            <input
              id="guestPhone"
              name="guestPhone"
              type="tel"
              required
              className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
            />
            {state.fieldErrors?.phone && (
              <p role="alert" className="text-sm text-red-700">
                {tErrors(state.fieldErrors.phone)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="guestEmail" className="text-sm font-medium text-brand-charcoal">
              {t("emailLabel")}
            </label>
            <input
              id="guestEmail"
              name="guestEmail"
              type="email"
              className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
            />
            {state.fieldErrors?.email && (
              <p role="alert" className="text-sm text-red-700">
                {tErrors(state.fieldErrors.email)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="guestNotes" className="text-sm font-medium text-brand-charcoal">
              {t("notesLabel")}
            </label>
            <textarea
              id="guestNotes"
              name="guestNotes"
              rows={3}
              maxLength={500}
              className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
            />
            {state.fieldErrors?.notes && (
              <p role="alert" className="text-sm text-red-700">
                {tErrors(state.fieldErrors.notes)}
              </p>
            )}
          </div>

          {state.formError && (
            <p role="alert" className="flex flex-wrap items-center gap-2 text-sm text-red-700">
              {tErrors(state.formError)}
              {state.formError === "slotTaken" && (
                <button
                  type="button"
                  onClick={() => {
                    setSlotIso(null);
                    setStep("datetime");
                  }}
                  className="underline"
                >
                  {t("pickAnotherTime")}
                </button>
              )}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-fit rounded-md bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-charcoal transition hover:opacity-90 disabled:opacity-60"
          >
            {isPending ? t("confirming") : t("confirmBooking")}
          </button>
        </form>
      )}
    </div>
  );
}
