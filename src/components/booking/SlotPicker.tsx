"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Shared date/time slot picker used by the guest booking wizard, the guest
 * self-service reschedule flow, and the specialist dashboard reschedule
 * flow. It doesn't know which of those it's in — each caller passes its
 * own server actions (guest ones are scoped by booking_token, the
 * dashboard one by session), so authorization stays with the caller while
 * the picking UI itself isn't duplicated three times.
 */
export function SlotPicker({
  initialDateStr,
  timezone,
  locale,
  getSlots,
  getEarliest,
  onSelect,
  selectedSlot,
}: {
  initialDateStr: string;
  timezone: string;
  locale: string;
  getSlots: (dateStr: string) => Promise<{ isWorkingDay: boolean; slots: string[] }>;
  getEarliest: () => Promise<{ dateStr: string; slot: string } | null>;
  onSelect: (iso: string) => void;
  selectedSlot?: string | null;
}) {
  const t = useTranslations("Booking");
  const [dateStr, setDateStr] = useState(initialDateStr);
  // Tagged with the date it was fetched for, so "isLoading" can be derived
  // (result missing, or stale from a previous date) instead of tracked as
  // a separate flag set synchronously at the top of the effect — React 19's
  // hooks lint flags that pattern as cascading-render-prone.
  const [result, setResult] = useState<{ dateStr: string; isWorkingDay: boolean; slots: string[] } | null>(null);
  const [noAvailability, setNoAvailability] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSlots(dateStr).then((res) => {
      if (!cancelled) setResult({ dateStr, ...res });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  const isLoading = !result || result.dateStr !== dateStr;

  const todayStr = new Date().toISOString().slice(0, 10);
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  });

  function shiftDay(delta: number) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta);
    const next = d.toISOString().slice(0, 10);
    if (next >= todayStr) setDateStr(next);
  }

  async function jumpToEarliest() {
    const earliest = await getEarliest();
    if (!earliest) {
      setNoAvailability(true);
      return;
    }
    setNoAvailability(false);
    setDateStr(earliest.dateStr);
    onSelect(earliest.slot);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftDay(-1)}
          disabled={dateStr <= todayStr}
          aria-label={t("previousDay")}
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm text-brand-charcoal disabled:opacity-30"
        >
          &lsaquo;
        </button>
        <div className="flex flex-col items-center gap-1">
          <input
            type="date"
            value={dateStr}
            min={todayStr}
            onChange={(event) => event.target.value && setDateStr(event.target.value)}
            aria-label={t("dateLabel")}
            className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm"
          />
          <span className="text-xs text-brand-charcoal/60">
            {dateFormatter.format(new Date(`${dateStr}T12:00:00Z`))}
          </span>
        </div>
        <button
          type="button"
          onClick={() => shiftDay(1)}
          aria-label={t("nextDay")}
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm text-brand-charcoal"
        >
          &rsaquo;
        </button>
      </div>

      <button type="button" onClick={jumpToEarliest} className="w-fit text-sm font-medium text-brand-green underline">
        {t("earliestAvailable")}
      </button>

      {isLoading && <p className="text-sm text-brand-charcoal/60">{t("loadingSlots")}</p>}

      {!isLoading && noAvailability && <p className="text-sm text-brand-charcoal/60">{t("noAvailability")}</p>}

      {!isLoading && result && !result.isWorkingDay && (
        <p className="text-sm text-brand-charcoal/60">{t("dayOffMessage")}</p>
      )}

      {!isLoading && result && result.isWorkingDay && result.slots.length === 0 && (
        <p className="text-sm text-brand-charcoal/60">{t("noSlotsMessage")}</p>
      )}

      {!isLoading && result && result.slots.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {result.slots.map((iso) => (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              aria-pressed={selectedSlot === iso}
              className={`rounded-md border px-3 py-2 text-sm transition ${
                selectedSlot === iso
                  ? "border-brand-gold bg-brand-gold/20 font-semibold text-brand-charcoal"
                  : "border-brand-charcoal/20 text-brand-charcoal hover:border-brand-charcoal/40"
              }`}
            >
              {timeFormatter.format(new Date(iso))}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
