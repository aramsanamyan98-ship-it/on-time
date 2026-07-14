import type { FieldErrors } from "@/lib/dashboard/errors";
import type { DaySchedule } from "@/lib/working-hours/defaults";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type DayFieldErrors = FieldErrors<"startTime" | "endTime">;

export function validateDay(day: DaySchedule): DayFieldErrors | null {
  if (day.isDayOff) return null;

  const errors: DayFieldErrors = {};
  if (!day.startTime) errors.startTime = "timeRequired";
  else if (!TIME_RE.test(day.startTime)) errors.startTime = "timeInvalid";

  if (!day.endTime) errors.endTime = "timeRequired";
  else if (!TIME_RE.test(day.endTime)) errors.endTime = "timeInvalid";

  if (!errors.startTime && !errors.endTime && day.endTime <= day.startTime) {
    errors.endTime = "endBeforeStart";
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
