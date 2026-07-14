"use server";

import { getSession } from "@/lib/session";
import { updateWorkingHours } from "@/lib/working-hours/update-working-hours";
import { DAYS_OF_WEEK, type DaySchedule, type DayOfWeek } from "@/lib/working-hours/defaults";
import type { DayFieldErrors } from "@/lib/working-hours/validation";
import type { DashboardErrorCode } from "@/lib/dashboard/errors";

export type WorkingHoursState = {
  dayErrors?: Partial<Record<DayOfWeek, DayFieldErrors>>;
  formError?: DashboardErrorCode;
  success?: boolean;
};

export async function updateWorkingHoursAction(
  _prevState: WorkingHoursState,
  formData: FormData,
): Promise<WorkingHoursState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };

  const days: DaySchedule[] = DAYS_OF_WEEK.map((dayOfWeek) => ({
    dayOfWeek,
    isDayOff: formData.get(`isDayOff-${dayOfWeek}`) === "on",
    startTime: String(formData.get(`startTime-${dayOfWeek}`) ?? ""),
    endTime: String(formData.get(`endTime-${dayOfWeek}`) ?? ""),
  }));

  const result = await updateWorkingHours(session.specialistId, days);
  if (!result.ok) {
    return { dayErrors: result.dayErrors };
  }
  return { success: true };
}
