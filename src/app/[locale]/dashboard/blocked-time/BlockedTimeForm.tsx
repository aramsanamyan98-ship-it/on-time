"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createBlockedTimeAction, type BlockedTimeState } from "./actions";

const initialState: BlockedTimeState = {};

// Controlled fields (not just `defaultValue`) so the confirm-and-cancel
// step below can carry the exact same range/reason forward as hidden
// inputs on its own `<form>`, without re-reading the DOM — see the
// `conflicts` block: it submits through the same `formAction` as the main
// form, just with `confirmed=1` added, whatever the specialist currently
// has entered.
export function BlockedTimeForm({ initialDateStr }: { initialDateStr: string }) {
  const t = useTranslations("BlockedTime");
  const tErrors = useTranslations("Dashboard.errors");
  const [state, formAction, isPending] = useActionState(createBlockedTimeAction, initialState);
  const [date, setDate] = useState(initialDateStr);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  // Guards against a stale "confirm & cancel" click: only trust
  // `state.conflicts` while the live fields still match the exact range
  // they were computed for (see BlockedTimeState.checkedRange) — editing
  // the date/time after seeing conflicts hides the stale list until the
  // specialist re-checks.
  const conflictsAreCurrent =
    !!state.conflicts &&
    state.conflicts.length > 0 &&
    state.checkedRange?.date === date &&
    state.checkedRange?.startTime === startTime &&
    state.checkedRange?.endTime === endTime;

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-brand-charcoal/70">
            {t("dateLabel")}
            <input
              type="date"
              name="date"
              value={date}
              min={initialDateStr}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-brand-charcoal/70">
            {t("startTimeLabel")}
            <input
              type="time"
              name="startTime"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-brand-charcoal/70">
            {t("endTimeLabel")}
            <input
              type="time"
              name="endTime"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm"
            />
          </label>
        </div>
        {(state.fieldErrors?.date || state.fieldErrors?.startTime || state.fieldErrors?.endTime) && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.date ?? state.fieldErrors.startTime ?? state.fieldErrors.endTime!)}
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm text-brand-charcoal/70">
          {t("reasonLabel")}
          <input
            type="text"
            name="reason"
            value={reason}
            maxLength={200}
            placeholder={t("reasonPlaceholder")}
            onChange={(event) => setReason(event.target.value)}
            className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm"
          />
        </label>
        {state.fieldErrors?.reason && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.reason)}
          </p>
        )}

        {state.formError && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.formError)}
          </p>
        )}

        <button type="submit" disabled={isPending} className="btn-primary w-fit">
          {isPending ? t("checking") : t("checkAndBlock")}
        </button>
      </form>

      {conflictsAreCurrent && state.conflicts && (
        <div className="panel flex flex-col gap-3 border border-red-200 bg-red-50">
          <p className="font-medium text-brand-charcoal">
            {t("conflictsTitle", { count: state.conflicts.length })}
          </p>
          <ul className="flex flex-col gap-2">
            {state.conflicts.map((conflict) => (
              <li key={conflict.id} className="text-sm text-brand-charcoal">
                {conflict.formattedDateTime} · {conflict.serviceName} · {conflict.guestName}
              </li>
            ))}
          </ul>
          <p className="body-text text-sm">{t("conflictsWarning")}</p>
          <form action={formAction} className="w-fit">
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="startTime" value={startTime} />
            <input type="hidden" name="endTime" value={endTime} />
            <input type="hidden" name="reason" value={reason} />
            <input type="hidden" name="confirmed" value="1" />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md border border-red-700 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-40"
            >
              {isPending ? t("checking") : t("confirmBlockAndCancel", { count: state.conflicts.length })}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
