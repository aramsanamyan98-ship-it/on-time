"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { CalendarRangeData, CalendarWorkingHour } from "@/lib/dashboard/calendar";

// FullCalendar is browser-only and heavy: load it only when the calendar is
// actually shown, and never render it on the server.
const AppointmentsCalendar = dynamic(() => import("./AppointmentsCalendar"), { ssr: false });

type View = "calendar" | "list";
const STORAGE_KEY = "ontime.appointmentsView";

function readStoredView(): View {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "list" ? "list" : "calendar";
  } catch {
    return "calendar";
  }
}

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function AppointmentsView({
  locale,
  timeZone,
  workingHours,
  initialData,
  children,
}: {
  locale: "hy" | "ru" | "en";
  timeZone: string;
  workingHours: CalendarWorkingHour[];
  initialData: CalendarRangeData;
  /** The existing server-rendered list view. */
  children: ReactNode;
}) {
  const t = useTranslations("Appointments");
  // null on the server / first render: the saved choice lives in the browser,
  // so rendering either view first would flash the wrong one.
  const view = useSyncExternalStore<View | null>(subscribe, readStoredView, () => null);

  function choose(next: View) {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode etc.) — the choice just isn't remembered.
    }
    listeners.forEach((listener) => listener());
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex self-start rounded-md border border-brand-charcoal/20 p-0.5" role="group">
        {(["calendar", "list"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => choose(option)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              view === option ? "bg-brand-green text-white" : "text-brand-charcoal hover:bg-brand-charcoal/5"
            }`}
          >
            {option === "calendar" ? t("viewCalendar") : t("viewList")}
          </button>
        ))}
      </div>

      {view === "calendar" && (
        <AppointmentsCalendar
          locale={locale}
          timeZone={timeZone}
          workingHours={workingHours}
          initialData={initialData}
        />
      )}
      {view === "list" && <div className="max-w-2xl">{children}</div>}
    </div>
  );
}
