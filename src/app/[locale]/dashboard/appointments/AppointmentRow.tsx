"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cancelAppointmentAction, type AppointmentActionState } from "./actions";

const initialState: AppointmentActionState = {};

export function AppointmentRow({
  appointment,
  locale,
  timezone,
}: {
  appointment: {
    id: string;
    serviceName: string;
    startAt: string;
    guestName: string;
    guestPhone: string;
  };
  locale: string;
  timezone: string;
}) {
  const t = useTranslations("Appointments");
  const tErrors = useTranslations("Booking.errors");
  const [state, formAction, isPending] = useActionState(cancelAppointmentAction, initialState);

  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-brand-charcoal">
          {dateTimeFormatter.format(new Date(appointment.startAt))}
        </p>
        <p className="text-sm text-brand-charcoal/70">{appointment.serviceName}</p>
        <p className="text-xs text-brand-charcoal/60">
          {appointment.guestName} · {appointment.guestPhone}
        </p>
        {state.formError && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.formError)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/appointments/${appointment.id}/reschedule`}
          className="text-sm font-medium text-brand-green underline"
        >
          {t("reschedule")}
        </Link>
        <form
          action={formAction}
          onSubmit={(event) => {
            if (!window.confirm(t("confirmCancel"))) event.preventDefault();
          }}
        >
          <input type="hidden" name="appointmentId" value={appointment.id} />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md border border-brand-charcoal/20 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:border-red-700 disabled:opacity-40"
          >
            {isPending ? t("cancelling") : t("cancel")}
          </button>
        </form>
      </div>
    </div>
  );
}
