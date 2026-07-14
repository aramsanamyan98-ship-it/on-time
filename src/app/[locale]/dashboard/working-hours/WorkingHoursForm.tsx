"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { updateWorkingHoursAction, type WorkingHoursState } from "./actions";
import type { DaySchedule } from "@/lib/working-hours/defaults";

const initialState: WorkingHoursState = {};

export function WorkingHoursForm({ initialSchedule }: { initialSchedule: DaySchedule[] }) {
  const t = useTranslations("WorkingHours");
  const tErrors = useTranslations("Dashboard.errors");
  const [state, formAction, isPending] = useActionState(updateWorkingHoursAction, initialState);
  const [dayOff, setDayOff] = useState<Record<number, boolean>>(
    Object.fromEntries(initialSchedule.map((day) => [day.dayOfWeek, day.isDayOff])),
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-brand-charcoal/10 rounded-lg border border-brand-charcoal/10">
        {initialSchedule.map((day) => {
          const errors = state.dayErrors?.[day.dayOfWeek];
          const isOff = dayOff[day.dayOfWeek];
          return (
            <div key={day.dayOfWeek} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="w-28 shrink-0 text-sm font-medium text-brand-charcoal">
                {t(`days.${day.dayOfWeek}`)}
              </span>

              <label className="flex items-center gap-2 text-sm text-brand-charcoal/70">
                <input
                  type="checkbox"
                  name={`isDayOff-${day.dayOfWeek}`}
                  defaultChecked={day.isDayOff}
                  onChange={(event) =>
                    setDayOff((prev) => ({ ...prev, [day.dayOfWeek]: event.target.checked }))
                  }
                  className="h-4 w-4"
                />
                {t("dayOff")}
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="time"
                  name={`startTime-${day.dayOfWeek}`}
                  defaultValue={day.startTime}
                  disabled={isOff}
                  aria-label={t("startTimeLabel")}
                  className="rounded-md border border-brand-charcoal/20 px-2 py-1 text-sm disabled:opacity-40"
                />
                <span className="text-brand-charcoal/40">–</span>
                <input
                  type="time"
                  name={`endTime-${day.dayOfWeek}`}
                  defaultValue={day.endTime}
                  disabled={isOff}
                  aria-label={t("endTimeLabel")}
                  className="rounded-md border border-brand-charcoal/20 px-2 py-1 text-sm disabled:opacity-40"
                />
              </div>

              {(errors?.startTime || errors?.endTime) && (
                <p role="alert" className="w-full text-sm text-red-700">
                  {errors.startTime ? tErrors(errors.startTime) : tErrors(errors.endTime!)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {state.formError && (
        <p role="alert" className="text-sm text-red-700">
          {tErrors(state.formError)}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-brand-green">
          {t("saved")}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
