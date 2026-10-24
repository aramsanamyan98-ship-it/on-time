"use client";

import { useTranslations } from "next-intl";
import { dayOfWeekFromDateStr, utcToZonedDateStr, utcToZonedTimeStr } from "@/lib/booking/timezone";

/**
 * Date/time labels for the booking wizard, built from our own translated
 * weekday and month names instead of Intl.DateTimeFormat: browsers' bundled
 * ICU data can lack Armenian (a real browser printed "Sat" for `hy`), which
 * would show English dates inside an Armenian page. Times stay "HH:mm".
 */
export function useDateLabels(timezone: string) {
  const t = useTranslations("Booking");
  const tHours = useTranslations("WorkingHours");
  const tProfile = useTranslations("PublicProfile");

  const weekdayShort = (dateStr: string) => tProfile(`daysShort.${dayOfWeekFromDateStr(dateStr)}`);

  /** "Saturday, October 24" / "суббота, 24 октября" for a barber-local "YYYY-MM-DD". */
  const longDate = (dateStr: string) =>
    t("dateLong", {
      weekday: tHours(`days.${dayOfWeekFromDateStr(dateStr)}`),
      day: Number(dateStr.slice(8)),
      month: t(`months.${Number(dateStr.slice(5, 7)) - 1}`),
    });

  const time = (iso: string) => utcToZonedTimeStr(new Date(iso), timezone);

  const longDateTime = (iso: string) =>
    t("dateTimeLong", { date: longDate(utcToZonedDateStr(new Date(iso), timezone)), time: time(iso) });

  return { weekdayShort, longDate, time, longDateTime };
}
