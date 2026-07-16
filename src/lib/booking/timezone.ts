/**
 * Dependency-free conversion between a specialist's local wall-clock time
 * (their `timezone` field, e.g. "Asia/Yerevan") and UTC instants, using the
 * standard Intl.DateTimeFormat offset trick instead of pulling in a date
 * library. Needed because working_hours.start_time/end_time are "HH:mm"
 * wall-clock strings (see prisma/schema.prisma), but appointments.start_at/
 * end_at are UTC instants (05_Database.md) — slot math has to bridge the two.
 */

function offsetMsAt(utcGuess: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcGuess);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asIfUtc - utcGuess.getTime();
}

/** Converts a "YYYY-MM-DD" + "HH:mm" wall-clock pair in `timeZone` to the UTC instant it represents. */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = offsetMsAt(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

/** Returns the "YYYY-MM-DD" calendar date a UTC instant falls on in `timeZone`. */
export function utcToZonedDateStr(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Returns the "HH:mm" wall-clock time a UTC instant falls on in `timeZone`. */
export function utcToZonedTimeStr(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("hour")}:${get("minute")}`;
}

/** Same-day helper: JS Date#getDay() convention (0 = Sunday) for a date string's weekday, timezone-agnostic since it only parses digits. */
export function dayOfWeekFromDateStr(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
