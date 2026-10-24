"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { canMarkOutcome, type CalendarAppointment, type CalendarStatus } from "@/lib/dashboard/calendar";
import { cancelAppointmentAction, setAppointmentOutcomeAction, type AppointmentActionState } from "./actions";

const initialState: AppointmentActionState = {};

const STATUS_KEY = {
  confirmed: "statusConfirmed",
  completed: "statusCompleted",
  no_show: "statusNoShow",
  cancelled: "statusCancelled",
} as const satisfies Record<CalendarStatus, string>;

export function BookingDetailsDialog({
  appointment,
  locale,
  timeZone,
  onClose,
  onChanged,
}: {
  appointment: CalendarAppointment;
  locale: string;
  timeZone: string;
  onClose: () => void;
  /** Called after a successful outcome change so the calendar refetches. */
  onChanged: () => void;
}) {
  const t = useTranslations("Appointments");
  const tErrors = useTranslations("Booking.errors");
  const [cancelState, cancelFormAction, isCancelling] = useActionState(cancelAppointmentAction, initialState);
  const [isSaving, startTransition] = useTransition();
  const [outcomeError, setOutcomeError] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const start = new Date(appointment.startAt);
  const end = new Date(appointment.endAt);
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(start);
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  });

  const ended = end.getTime() <= now.getTime();
  const showOutcome = canMarkOutcome(appointment.status, end, now);
  const showUpcomingActions = appointment.status === "confirmed" && !ended;

  function setOutcome(outcome: "completed" | "no_show") {
    setOutcomeError(null);
    startTransition(async () => {
      const result = await setAppointmentOutcomeAction(appointment.id, outcome);
      if (result.ok) {
        onChanged();
      } else {
        setOutcomeError(t(result.error === "notEnded" ? "outcomeNotEnded" : "outcomeFailed"));
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-charcoal/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("detailsTitle")}
        className="panel flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-b-none sm:max-w-md sm:rounded-b-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-brand-charcoal">{appointment.guestName}</p>
            <p className="body-text text-sm">{appointment.serviceName}</p>
          </div>
          <span className={`ot-status-badge ot-status-${appointment.status}`}>{t(STATUS_KEY[appointment.status])}</span>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-brand-charcoal/60">{t("detailsTime")}</dt>
          <dd className="text-brand-charcoal">
            {dateLabel}, {timeFormatter.format(start)}–{timeFormatter.format(end)}
          </dd>
          <dt className="text-brand-charcoal/60">{t("detailsPhone")}</dt>
          <dd>
            <a href={`tel:${appointment.guestPhone}`} className="font-medium text-brand-green underline">
              {appointment.guestPhone}
            </a>
          </dd>
          {appointment.guestNotes && (
            <>
              <dt className="text-brand-charcoal/60">{t("detailsNotes")}</dt>
              <dd className="text-brand-charcoal">{appointment.guestNotes}</dd>
            </>
          )}
        </dl>

        {showOutcome && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isSaving || appointment.status === "completed"}
                onClick={() => setOutcome("completed")}
                className="btn-primary"
              >
                {t("markCompleted")}
              </button>
              <button
                type="button"
                disabled={isSaving || appointment.status === "no_show"}
                onClick={() => setOutcome("no_show")}
                className="btn-outline"
              >
                {t("markNoShow")}
              </button>
            </div>
            {outcomeError && (
              <p role="alert" className="text-sm text-red-700">
                {outcomeError}
              </p>
            )}
          </div>
        )}

        {showUpcomingActions && (
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/dashboard/appointments/${appointment.id}/reschedule`}
              className="text-sm font-medium text-brand-green underline"
            >
              {t("reschedule")}
            </Link>
            <form
              action={cancelFormAction}
              onSubmit={(event) => {
                if (!window.confirm(t("confirmCancel"))) event.preventDefault();
              }}
            >
              <input type="hidden" name="appointmentId" value={appointment.id} />
              <button
                type="submit"
                disabled={isCancelling}
                className="rounded-md border border-brand-charcoal/20 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:border-red-700 hover:bg-red-50 disabled:opacity-40"
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

        <button type="button" onClick={onClose} className="btn-outline self-end">
          {t("close")}
        </button>
      </div>
    </div>
  );
}
