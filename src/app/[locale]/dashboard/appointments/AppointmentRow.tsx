"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cancelAppointmentAction, type AppointmentActionState } from "./actions";

const initialState: AppointmentActionState = {};

// `formattedDateTime` is pre-formatted by the server (not `startAt` +
// `locale` reformatted here) so the exact same string is used for both the
// SSR HTML and hydration — formatting via Intl.DateTimeFormat inside a
// client component re-runs in the browser during hydration, and for
// less-common locales the server's and browser's bundled ICU/CLDR data can
// disagree on "short" weekday/month names, causing a hydration mismatch.
export function AppointmentRow({
  appointment,
}: {
  appointment: {
    id: string;
    serviceName: string;
    formattedDateTime: string;
    guestName: string;
    guestPhone: string;
  };
}) {
  const t = useTranslations("Appointments");
  const tErrors = useTranslations("Booking.errors");
  const [state, formAction, isPending] = useActionState(cancelAppointmentAction, initialState);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-brand-charcoal">{appointment.formattedDateTime}</p>
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
