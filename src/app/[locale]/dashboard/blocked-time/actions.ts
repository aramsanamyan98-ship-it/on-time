"use server";

import { getLocale } from "next-intl/server";
import { getSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { zonedTimeToUtc } from "@/lib/booking/timezone";
import { findConflictingAppointments } from "@/lib/booking/blocked-time";
import { cancelAppointment } from "@/lib/booking/cancel-booking";
import type { AppLocale } from "@/i18n/routing";
import type { DashboardErrorCode, FieldErrors } from "@/lib/dashboard/errors";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const REASON_MAX_LENGTH = 200;

async function loadActiveSpecialist(specialistId: string) {
  const specialist = await prisma.specialist.findUnique({ where: { id: specialistId } });
  if (!specialist || !specialist.emailVerifiedAt || specialist.deletedAt) return null;
  return specialist;
}

export type BlockedTimeFieldErrors = FieldErrors<"date" | "startTime" | "endTime" | "reason">;

export type ConflictSummary = {
  id: string;
  formattedDateTime: string;
  guestName: string;
  serviceName: string;
};

export type BlockedTimeState = {
  fieldErrors?: BlockedTimeFieldErrors;
  formError?: DashboardErrorCode;
  /**
   * Populated instead of creating the block when the requested range
   * overlaps one or more active appointments and the submission wasn't
   * already marked `confirmed` — the form re-renders this list with a
   * second "confirm & cancel" submit that re-sends the same field values
   * plus `confirmed=1` (see BlockedTimeForm.tsx). Never created without
   * this confirmation step.
   */
  conflicts?: ConflictSummary[];
  /**
   * The exact date/startTime/endTime this `conflicts` list was computed
   * for — lets the form tell a still-current confirmation apart from a
   * stale one (specialist edited the range after seeing conflicts, without
   * re-checking) and hide the stale list rather than let a "confirm" click
   * cancel appointments for a range that was never actually re-verified.
   */
  checkedRange?: { date: string; startTime: string; endTime: string };
};

/**
 * Rebooking-assist feature (item 2): creates a specialist's blocked-time
 * range, but only after checking it against existing active appointments.
 * A conflict-free (or already-confirmed) submission creates the block and
 * cancels every conflicting appointment one at a time via the same
 * cancelAppointment() used by the specialist-dashboard single-cancel flow
 * — which is what queues each affected guest's own rebooking-notice
 * notification (src/lib/booking/cancel-booking.ts). Works the same whether
 * one appointment or several fall inside the blocked range, since each is
 * cancelled (and notified) independently.
 */
export async function createBlockedTimeAction(
  _prevState: BlockedTimeState,
  formData: FormData,
): Promise<BlockedTimeState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };
  const locale = (await getLocale()) as AppLocale;

  const specialist = await loadActiveSpecialist(session.specialistId);
  if (!specialist) return { formError: "generic" };

  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const confirmed = formData.get("confirmed") === "1";

  const fieldErrors: BlockedTimeFieldErrors = {};
  if (!date) fieldErrors.date = "dateRequired";
  else if (!DATE_RE.test(date)) fieldErrors.date = "dateInvalid";

  if (!startTime) fieldErrors.startTime = "timeRequired";
  else if (!TIME_RE.test(startTime)) fieldErrors.startTime = "timeInvalid";

  if (!endTime) fieldErrors.endTime = "timeRequired";
  else if (!TIME_RE.test(endTime)) fieldErrors.endTime = "timeInvalid";

  if (!fieldErrors.startTime && !fieldErrors.endTime && endTime <= startTime) {
    fieldErrors.endTime = "endBeforeStart";
  }

  if (reason.length > REASON_MAX_LENGTH) fieldErrors.reason = "reasonTooLong";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const startAt = zonedTimeToUtc(date, startTime, specialist.timezone);
  const endAt = zonedTimeToUtc(date, endTime, specialist.timezone);

  const conflicts = await findConflictingAppointments(specialist.id, startAt, endAt);

  if (conflicts.length > 0 && !confirmed) {
    const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: specialist.timezone,
    });
    return {
      conflicts: conflicts.map((appointment) => ({
        id: appointment.id,
        formattedDateTime: dateTimeFormatter.format(appointment.startAt),
        guestName: appointment.guestName,
        serviceName: appointment.service.name,
      })),
      checkedRange: { date, startTime, endTime },
    };
  }

  await prisma.blockedTime.create({
    data: { specialistId: specialist.id, startAt, endAt, reason: reason || null },
  });

  for (const appointment of conflicts) {
    await cancelAppointment(appointment, specialist, "specialist");
  }

  return redirect({ href: "/dashboard/blocked-time?added=1", locale });
}

export type DeleteBlockedTimeState = { formError?: DashboardErrorCode };

export async function deleteBlockedTimeAction(
  _prevState: DeleteBlockedTimeState,
  formData: FormData,
): Promise<DeleteBlockedTimeState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };
  const locale = (await getLocale()) as AppLocale;

  const id = String(formData.get("id") ?? "");
  const existing = await prisma.blockedTime.findFirst({ where: { id, specialistId: session.specialistId } });
  if (!existing) return { formError: "notFound" };

  await prisma.blockedTime.delete({ where: { id: existing.id } });

  return redirect({ href: "/dashboard/blocked-time?deleted=1", locale });
}
