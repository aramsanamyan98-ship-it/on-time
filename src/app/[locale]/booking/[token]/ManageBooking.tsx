"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { SlotPicker } from "@/components/booking/SlotPicker";
import type { ManageBookingState } from "./actions";

type AppointmentSummary = {
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  serviceName: string;
  durationMinutes: number;
  priceAmd: number;
  startAt: string;
  guestName: string;
  specialistName: string;
  timezone: string;
};

const initialState: ManageBookingState = {};

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

  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: appointment.timezone,
  });
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
      <div className="flex max-w-lg flex-col gap-3 rounded-lg border border-brand-charcoal/10 px-4 py-4">
        <p className="font-medium text-brand-charcoal">{t("alreadyCancelledTitle")}</p>
        <p className="text-sm text-brand-charcoal/70">{t("alreadyCancelledMessage")}</p>
      </div>
    );
  }

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

      <div className="flex flex-col gap-2 rounded-lg border border-brand-charcoal/10 px-4 py-4">
        <p className="text-sm text-brand-charcoal/60">{t("withSpecialist", { name: appointment.specialistName })}</p>
        <p className="text-lg font-semibold text-brand-charcoal">{appointment.serviceName}</p>
        <p className="text-brand-charcoal">{dateTimeFormatter.format(new Date(appointment.startAt))}</p>
        <p className="text-sm text-brand-charcoal/70">
          {tServices("durationValue", { minutes: appointment.durationMinutes })} ·{" "}
          {tServices("priceValue", { price: appointment.priceAmd })}
        </p>
      </div>

      {mode === "view" && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setMode("reschedule")}
            className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
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
              className="rounded-md border border-brand-charcoal/20 px-4 py-2 text-sm font-medium text-red-700 transition hover:border-red-700 disabled:opacity-40"
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
            <p className="text-sm text-brand-charcoal/70">
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
              className="w-fit rounded-md bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-charcoal transition hover:opacity-90 disabled:opacity-40"
            >
              {isRescheduling ? t("confirming") : t("confirmReschedule")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("view");
                setSlotIso(null);
              }}
              className="w-fit rounded-md border border-brand-charcoal/20 px-4 py-2 text-sm font-medium text-brand-charcoal"
            >
              {t("keepOriginalTime")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
