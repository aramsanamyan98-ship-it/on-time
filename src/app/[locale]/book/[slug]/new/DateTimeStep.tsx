"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { addDaysToDateStr } from "@/lib/booking/timezone";
import { DAY_STRIP_LENGTH, type DayAvailability } from "@/lib/booking/day-availability";
import { useDateLabels } from "./date-labels";

type DaysResult = { key: string; todayDateStr: string; days: DayAvailability[] };
type SlotsResult = { key: string; isWorkingDay: boolean; slots: string[] };

/**
 * "Date & time" step of the booking wizard: a horizontal strip of the next 14
 * days (days off and fully booked days greyed out and disabled) and, under it,
 * the free times of the chosen day as a grid. Continue stays disabled until a
 * time from the shown day is picked.
 */
export function DateTimeStep({
  specialistId,
  serviceId,
  timezone,
  todayDateStr,
  initialDateStr,
  selectedSlot,
  onSelect,
  onContinue,
  getDayAvailabilityAction,
  getSlotsForDateAction,
  getEarliestAvailableAction,
}: {
  specialistId: string;
  serviceId: string;
  timezone: string;
  /** The barber's calendar "today" (not the UTC date). */
  todayDateStr: string;
  initialDateStr: string;
  selectedSlot: string | null;
  onSelect: (iso: string | null) => void;
  onContinue: () => void;
  getDayAvailabilityAction: (
    specialistId: string,
    serviceId: string,
    fromDateStr?: string,
  ) => Promise<{ todayDateStr: string; days: DayAvailability[] } | null>;
  getSlotsForDateAction: (
    specialistId: string,
    serviceId: string,
    dateStr: string,
  ) => Promise<{ isWorkingDay: boolean; slots: string[] }>;
  getEarliestAvailableAction: (
    specialistId: string,
    serviceId: string,
  ) => Promise<{ dateStr: string; slot: string } | null>;
}) {
  const t = useTranslations("Booking");
  const labels = useDateLabels(timezone);

  // The strip normally starts today; it only starts later when the requested
  // date (a Story link) or the nearest free time is beyond the 14-day window.
  const [windowStart, setWindowStart] = useState(
    initialDateStr > addDaysToDateStr(todayDateStr, DAY_STRIP_LENGTH - 1) ? initialDateStr : todayDateStr,
  );
  const [chosenDate, setChosenDate] = useState(initialDateStr);
  const [daysResult, setDaysResult] = useState<DaysResult | null>(null);
  const [daysFailed, setDaysFailed] = useState(false);
  const [slotsResult, setSlotsResult] = useState<SlotsResult | null>(null);
  const [noAvailability, setNoAvailability] = useState(false);
  const [nearestNote, setNearestNote] = useState<string | null>(null);
  const stripRef = useRef<HTMLUListElement>(null);

  const daysKey = `${serviceId}|${windowStart}`;
  const daysLoading = !daysResult || daysResult.key !== daysKey;
  const days = useMemo(() => (!daysLoading && daysResult ? daysResult.days : []), [daysLoading, daysResult]);

  // The day actually shown: the chosen one if it's still open, else the first open day.
  const activeDate = useMemo(() => {
    if (days.find((d) => d.dateStr === chosenDate && d.status === "open")) return chosenDate;
    return days.find((d) => d.status === "open")?.dateStr ?? null;
  }, [days, chosenDate]);

  useEffect(() => {
    let cancelled = false;
    getDayAvailabilityAction(specialistId, serviceId, windowStart)
      .then((res) => {
        if (cancelled) return;
        if (!res) {
          setDaysFailed(true);
          return;
        }
        setDaysFailed(false);
        setDaysResult({ key: daysKey, ...res });
      })
      .catch(() => !cancelled && setDaysFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, windowStart]);

  const slotsKey = activeDate ? `${serviceId}|${activeDate}` : null;
  useEffect(() => {
    if (!activeDate || !slotsKey) return;
    let cancelled = false;
    getSlotsForDateAction(specialistId, serviceId, activeDate)
      .then((res) => {
        if (!cancelled) setSlotsResult({ key: slotsKey, ...res });
      })
      .catch(() => !cancelled && setSlotsResult({ key: slotsKey, isWorkingDay: true, slots: [] }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotsKey]);

  // Keep the chosen day in view when it changes (also after "nearest free time" jumps).
  useEffect(() => {
    stripRef.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [activeDate, daysLoading]);

  const slotsLoading = !!activeDate && (!slotsResult || slotsResult.key !== slotsKey);
  const slots = !slotsLoading && slotsResult ? slotsResult.slots : [];
  const canContinue = selectedSlot !== null && slots.includes(selectedSlot);

  function dayLabel(dateStr: string) {
    if (dateStr === todayDateStr) return t("dayToday");
    if (dateStr === addDaysToDateStr(todayDateStr, 1)) return t("dayTomorrow");
    return labels.weekdayShort(dateStr);
  }

  async function showNearest() {
    const earliest = await getEarliestAvailableAction(specialistId, serviceId);
    if (!earliest) {
      setNoAvailability(true);
      setNearestNote(null);
      return;
    }
    setNoAvailability(false);
    const inWindow = days.some((d) => d.dateStr === earliest.dateStr);
    if (!inWindow) setWindowStart(earliest.dateStr);
    setChosenDate(earliest.dateStr);
    onSelect(earliest.slot);
    setNearestNote(
      t("nearestFound", {
        when: labels.longDateTime(earliest.slot),
      }),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-brand-charcoal">{t("dayStripLabel")}</p>
        {daysFailed && (
          <p role="alert" className="text-sm text-red-700">
            {t("daysError")}
          </p>
        )}
        {daysLoading && !daysFailed && <p className="text-sm text-brand-muted">{t("loadingDays")}</p>}
        {!daysLoading && (
          <ul ref={stripRef} className="-mx-5 flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pb-2">
            {days.map((day) => {
              const selected = day.dateStr === activeDate;
              const unavailable = day.status !== "open";
              const reason = day.status === "dayOff" ? t("dayOffLabel") : day.status === "full" ? t("dayFullLabel") : "";
              return (
                <li key={day.dateStr} className="shrink-0 snap-start">
                  <button
                    type="button"
                    disabled={unavailable}
                    aria-pressed={selected}
                    aria-label={`${labels.longDate(day.dateStr)}${reason ? `, ${reason}` : ""}`}
                    onClick={() => {
                      setChosenDate(day.dateStr);
                      setNearestNote(null);
                    }}
                    className={`flex min-h-16 w-16 flex-col items-center justify-center rounded-2xl border-[1.5px] leading-tight transition ${
                      selected
                        ? "border-brand-green bg-brand-green text-brand-cream"
                        : unavailable
                          ? "cursor-not-allowed border-brand-card-border bg-brand-charcoal/5 text-brand-charcoal/40"
                          : "border-brand-sand bg-white text-brand-charcoal hover:border-brand-green"
                    }`}
                  >
                    <span className="text-[0.6875rem] font-medium">{dayLabel(day.dateStr)}</span>
                    <span className="text-lg font-bold">{Number(day.dateStr.slice(8))}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-x-4">
          <button
            type="button"
            onClick={showNearest}
            className="min-h-11 text-sm font-semibold text-brand-green underline"
          >
            {t("nearestFree")}
          </button>
          {windowStart !== todayDateStr && (
            <button
              type="button"
              onClick={() => {
                setWindowStart(todayDateStr);
                setChosenDate(todayDateStr);
              }}
              className="min-h-11 text-sm font-semibold text-brand-green underline"
            >
              {t("backToToday")}
            </button>
          )}
        </div>
        {noAvailability && <p className="text-sm text-brand-muted">{t("noAvailability")}</p>}
        {nearestNote && (
          <p role="status" className="text-sm text-brand-muted">
            {nearestNote}
          </p>
        )}
      </div>

      {!daysLoading && activeDate === null && !daysFailed && (
        <p className="text-sm text-brand-muted">{t("noAvailability")}</p>
      )}

      {activeDate && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-brand-charcoal">{t("timesLabel")}</p>
          {slotsLoading && <p className="text-sm text-brand-muted">{t("loadingSlots")}</p>}
          {!slotsLoading && slots.length === 0 && <p className="text-sm text-brand-muted">{t("noSlotsMessage")}</p>}
          {slots.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((iso) => (
                <li key={iso}>
                  <button
                    type="button"
                    aria-pressed={selectedSlot === iso}
                    onClick={() => {
                      onSelect(iso);
                      setNearestNote(null);
                    }}
                    className={`min-h-12 w-full rounded-xl border-[1.5px] px-2 text-base font-semibold transition ${
                      selectedSlot === iso
                        ? "border-brand-green bg-brand-green text-brand-cream"
                        : "border-brand-sand bg-white text-brand-charcoal hover:border-brand-green"
                    }`}
                  >
                    {labels.time(iso)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!canContinue}
        onClick={onContinue}
        className="mt-1 min-h-12 w-full rounded-xl bg-brand-green px-5 text-base font-bold text-brand-cream transition hover:bg-brand-green-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t("continue")}
      </button>
    </div>
  );
}
