"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import luxon3Plugin from "@fullcalendar/luxon3";
import hyLocale from "@fullcalendar/core/locales/hy-am";
import ruLocale from "@fullcalendar/core/locales/ru";
import type { DatesSetArg, EventContentArg, EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import {
  visibleTimeRange,
  workingBusinessHours,
  type CalendarAppointment,
  type CalendarBlock,
  type CalendarRangeData,
  type CalendarWorkingHour,
} from "@/lib/dashboard/calendar";
import { utcToZonedTimeStr } from "@/lib/booking/timezone";
import { BookingDetailsDialog } from "./BookingDetailsDialog";
import { getCalendarRangeAction } from "./actions";

type ViewType = "timeGridDay" | "timeGridWeek";

const FC_LOCALE = { hy: "hy-am", ru: "ru", en: "en" } as const;
const LEGEND = [
  ["confirmed", "statusConfirmed"],
  ["completed", "statusCompleted"],
  ["no_show", "statusNoShow"],
  ["cancelled", "statusCancelled"],
] as const;

const TIME_FORMAT = { hour: "2-digit", minute: "2-digit", hour12: false } as const;

export default function AppointmentsCalendar({
  locale,
  timeZone,
  workingHours,
  initialData,
}: {
  locale: "hy" | "ru" | "en";
  timeZone: string;
  workingHours: CalendarWorkingHour[];
  initialData: CalendarRangeData;
}) {
  const t = useTranslations("Appointments");
  const calendarRef = useRef<FullCalendar>(null);
  // Read through a ref so `loadEvents` keeps a stable identity (FullCalendar
  // refetches whenever the `events` function prop changes).
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  // Set once any booking changes, so the server-rendered first range is no
  // longer trusted and every range is refetched.
  const staleInitialRef = useRef(false);

  // Phones (narrow screens) default to the day view, desktop to the week.
  const [initialView] = useState<ViewType>(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "timeGridDay" : "timeGridWeek",
  );
  const [view, setView] = useState<ViewType>(initialView);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(initialData.appointments);
  const [blocks, setBlocks] = useState<CalendarBlock[]>(initialData.blocks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [blockNote, setBlockNote] = useState<string | null>(null);

  const selected = appointments.find((a) => a.id === selectedId) ?? null;
  const slotRange = useMemo(
    () => visibleTimeRange(workingHours, appointments, timeZone),
    [workingHours, appointments, timeZone],
  );
  const businessHours = useMemo(() => workingBusinessHours(workingHours), [workingHours]);
  // Opens scrolled to roughly an hour before "now" (within the visible range).
  const [scrollTime] = useState(() => {
    const hour = Number(utcToZonedTimeStr(new Date(), timeZone).slice(0, 2));
    return `${String(Math.max(hour - 1, 0)).padStart(2, "0")}:00:00`;
  });

  const loadEvents = useCallback(
    async (
      info: EventSourceFuncArg,
      success: (events: EventInput[]) => void,
      failure: (error: Error) => void,
    ) => {
      try {
        let data: CalendarRangeData | null;
        const coveredByInitial =
          !staleInitialRef.current &&
          info.start.getTime() >= Date.parse(initialData.from) &&
          info.end.getTime() <= Date.parse(initialData.to);
        if (coveredByInitial) {
          data = initialData;
        } else {
          setLoading(true);
          data = await getCalendarRangeAction(info.start.toISOString(), info.end.toISOString());
        }
        if (!data) throw new Error("range unavailable");

        setLoadError(false);
        setAppointments(data.appointments);
        setBlocks(data.blocks);
        success([
          ...data.appointments.map<EventInput>((a) => ({
            id: a.id,
            title: a.guestName,
            start: a.startAt,
            end: a.endAt,
            classNames: [`ot-event`, `ot-event-${a.status}`],
            extendedProps: { kind: "appointment", serviceName: a.serviceName, status: a.status },
          })),
          ...data.blocks.map<EventInput>((b) => ({
            id: `blocked-${b.id}`,
            title: b.reason ?? tRef.current("blockedTime"),
            start: b.startAt,
            end: b.endAt,
            display: "background",
            classNames: ["ot-blocked"],
            extendedProps: { kind: "blocked" },
          })),
        ]);
      } catch (error) {
        setLoadError(true);
        failure(error instanceof Error ? error : new Error("load failed"));
      } finally {
        setLoading(false);
      }
    },
    [initialData],
  );

  const api = () => calendarRef.current?.getApi();

  function onDatesSet(arg: DatesSetArg) {
    setTitle(arg.view.title);
    setView(arg.view.type as ViewType);
    setBlockNote(null);
  }

  function renderEvent(arg: EventContentArg) {
    if (arg.event.extendedProps.kind === "blocked") {
      return <div className="ot-blocked-label">{arg.event.title}</div>;
    }
    return (
      <div className="ot-event-body">
        <span className="ot-event-time">{arg.timeText}</span>
        <span className="ot-event-name">{arg.event.title}</span>
        <span className="ot-event-service">{arg.event.extendedProps.serviceName}</span>
      </div>
    );
  }

  function refreshAfterChange() {
    staleInitialRef.current = true;
    api()?.refetchEvents();
  }

  return (
    <div className="ot-calendar flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button type="button" className="btn-outline" onClick={() => api()?.today()}>
            {t("today")}
          </button>
          <button type="button" className="btn-outline px-3" aria-label={t("previous")} onClick={() => api()?.prev()}>
            ‹
          </button>
          <button type="button" className="btn-outline px-3" aria-label={t("next")} onClick={() => api()?.next()}>
            ›
          </button>
        </div>
        <p className="min-w-0 flex-1 truncate text-center font-semibold text-brand-charcoal sm:flex-none">{title}</p>
        <div className="inline-flex rounded-md border border-brand-charcoal/20 p-0.5" role="group">
          {(["timeGridDay", "timeGridWeek"] as const).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={view === type}
              onClick={() => api()?.changeView(type)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                view === type ? "bg-brand-green text-white" : "text-brand-charcoal hover:bg-brand-charcoal/5"
              }`}
            >
              {type === "timeGridDay" ? t("day") : t("week")}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-charcoal/70">
        {LEGEND.map(([status, key]) => (
          <li key={status} className="flex items-center gap-1.5">
            <span className={`ot-legend-dot ot-event-${status}`} aria-hidden />
            {t(key)}
          </li>
        ))}
      </ul>

      {loadError && (
        <p role="alert" className="text-sm text-red-700">
          {t("loadError")}
        </p>
      )}
      {blockNote && <p className="text-sm text-brand-charcoal/70">{blockNote}</p>}

      <div className={`surface-card p-2 sm:p-3 ${loading ? "opacity-70" : ""}`} aria-busy={loading}>
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin, luxon3Plugin]}
          initialView={initialView}
          headerToolbar={false}
          timeZone={timeZone}
          locales={[hyLocale, ruLocale]}
          locale={FC_LOCALE[locale]}
          firstDay={1}
          allDaySlot={false}
          nowIndicator
          editable={false}
          selectable={false}
          height="72vh"
          slotMinTime={slotRange.min}
          slotMaxTime={slotRange.max}
          scrollTime={scrollTime}
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          slotLabelFormat={TIME_FORMAT}
          eventTimeFormat={TIME_FORMAT}
          dayHeaderFormat={{ weekday: "short", day: "numeric" }}
          businessHours={businessHours.length > 0 ? businessHours : false}
          events={loadEvents}
          eventContent={renderEvent}
          eventDidMount={(arg) => {
            if (arg.event.extendedProps.kind === "blocked") arg.el.title = arg.event.title;
          }}
          eventClick={(arg) => {
            if (arg.event.extendedProps.kind === "appointment") setSelectedId(arg.event.id);
          }}
          dateClick={(arg) => {
            // Background (blocked) periods aren't clickable themselves, so a
            // tap on the shaded area surfaces its reason instead.
            const at = arg.date.getTime();
            const hit = blocks.find((b) => Date.parse(b.startAt) <= at && at < Date.parse(b.endAt));
            setBlockNote(hit ? (hit.reason ?? t("blockedTime")) : null);
          }}
          datesSet={onDatesSet}
        />
      </div>

      {selected && (
        <BookingDetailsDialog
          appointment={selected}
          locale={locale}
          timeZone={timeZone}
          onClose={() => setSelectedId(null)}
          onChanged={refreshAfterChange}
        />
      )}
    </div>
  );
}
