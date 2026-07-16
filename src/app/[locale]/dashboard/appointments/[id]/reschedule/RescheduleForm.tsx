"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { SlotPicker } from "@/components/booking/SlotPicker";
import {
  rescheduleAppointmentAction,
  getAppointmentRescheduleSlotsAction,
  getAppointmentRescheduleEarliestAction,
  type AppointmentActionState,
} from "../../actions";

const initialState: AppointmentActionState = {};

export function RescheduleForm({
  appointmentId,
  timezone,
  locale,
  initialDateStr,
}: {
  appointmentId: string;
  timezone: string;
  locale: string;
  initialDateStr: string;
}) {
  const t = useTranslations("Appointments");
  const tErrors = useTranslations("Booking.errors");
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(rescheduleAppointmentAction, initialState);

  const slotFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="startAt" value={slotIso ?? ""} />

      <SlotPicker
        initialDateStr={initialDateStr}
        timezone={timezone}
        locale={locale}
        getSlots={(dateStr) => getAppointmentRescheduleSlotsAction(appointmentId, dateStr)}
        getEarliest={() => getAppointmentRescheduleEarliestAction(appointmentId)}
        onSelect={setSlotIso}
        selectedSlot={slotIso}
      />

      {slotIso && (
        <p className="text-sm text-brand-charcoal/70">
          {t("newTimePreview", { time: slotFormatter.format(new Date(slotIso)) })}
        </p>
      )}

      {state.formError && (
        <p role="alert" className="text-sm text-red-700">
          {tErrors(state.formError)}
        </p>
      )}

      <button
        type="submit"
        disabled={!slotIso || isPending}
        className="w-fit rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {isPending ? t("confirming") : t("confirmReschedule")}
      </button>
    </form>
  );
}
