import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { processQueuedNotifications } from "@/lib/notifications/process";
import { hasFullAccess } from "@/lib/subscription/trial";
import type { Appointment, NotificationType, Specialist } from "@/generated/prisma/client";

// 07_Business_Rules.md leaves reminder timing as an open decision ("e.g.,
// 24 hours ... adjust later") — 24 hours is a reasonable v1 default,
// overridable per-deployment without a code change.
const REMINDER_LEAD_HOURS = Number(process.env.REMINDER_LEAD_HOURS ?? 24);

function reminderScheduledFor(startAt: Date): Date {
  return new Date(startAt.getTime() - REMINDER_LEAD_HOURS * 60 * 60 * 1000);
}

async function enqueueReminderIfNeeded(appointment: Appointment): Promise<void> {
  if (!appointment.guestEmail) return;
  const remindAt = reminderScheduledFor(appointment.startAt);
  if (remindAt <= new Date()) return; // too close to (or past) the appointment for a lead-time reminder to be useful

  await prisma.notificationLog.create({
    data: {
      appointmentId: appointment.id,
      type: "reminder",
      channel: "email",
      recipient: appointment.guestEmail,
      scheduledFor: remindAt,
    },
  });
}

/**
 * Queues one immediately-due notification and schedules a post-response
 * processing pass — the shared shape behind every enqueue* function below.
 * Never throws: a failed enqueue must not affect the booking action that
 * triggered it (07_Business_Rules.md Notifications).
 */
async function enqueueNow(appointmentId: string, type: NotificationType, recipient: string): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: { appointmentId, type, channel: "email", recipient, scheduledFor: new Date() },
    });
    after(() => {
      processQueuedNotifications().catch((err) => {
        console.error(`[notifications] post-${type} queue processing failed:`, err);
      });
    });
  } catch (err) {
    console.error(`[notifications] failed to enqueue ${type}:`, err);
  }
}

/**
 * Called right after a guest books (guest-initiated or manual specialist
 * entry) — 02_PRD.md Section 9 / 08_Roadmap.md Phase 6. Queues the guest's
 * confirmation + reminder. Confirmations are due immediately, but must not
 * be sent synchronously during the booking request; `enqueueNow`'s
 * `after()` defers the actual send until the response has gone out to the
 * guest, and the cron-triggered route remains the durable path regardless.
 *
 * 02_PRD.md Section 14 (updated): reminders are a Starter/Pro (and
 * active-trial) feature — Basic only gets the booking confirmation.
 * `hasFullAccess` is the same tier boundary used everywhere else.
 */
export async function enqueueBookingNotifications(appointment: Appointment, specialist: Specialist): Promise<void> {
  if (!appointment.guestEmail) return; // only channel implemented this phase is email (02_PRD.md Section 9); nothing to queue without an address
  await enqueueNow(appointment.id, "booking_confirmation", appointment.guestEmail);
  if (!hasFullAccess(specialist)) return;
  try {
    await enqueueReminderIfNeeded(appointment);
  } catch (err) {
    console.error("[notifications] failed to enqueue reminder:", err);
  }
}

/**
 * Specialist-facing alerts (02_PRD.md Section 9 "New booking notification
 * sent to specialist"; 07_Business_Rules.md: the specialist is notified of
 * a guest-initiated cancel/reschedule "the same as if the specialist had
 * made the change"). Only ever called for guest-initiated events — a
 * specialist doesn't need to be alerted about their own manual entry or
 * their own cancel/reschedule (see call sites in create-booking.ts /
 * cancel-booking.ts / reschedule-booking.ts).
 */
export async function enqueueNewBookingAlert(appointment: Appointment, specialist: Specialist): Promise<void> {
  await enqueueNow(appointment.id, "new_booking_alert", specialist.email);
}

export async function enqueueGuestCancelledAlert(appointment: Appointment, specialist: Specialist): Promise<void> {
  await enqueueNow(appointment.id, "cancellation", specialist.email);
}

export async function enqueueGuestRescheduledAlert(appointment: Appointment, specialist: Specialist): Promise<void> {
  await enqueueNow(appointment.id, "reschedule_alert", specialist.email);
}

/**
 * Called after a reschedule (guest self-service or specialist-initiated) —
 * keeps the reminder pointed at the appointment's new time instead of
 * firing for the slot it no longer occupies. Basic-plan specialists (past
 * trial) never get a reminder re-queued, same gating as the initial
 * booking (see enqueueBookingNotifications).
 */
export async function rescheduleReminderNotification(appointment: Appointment, specialist: Specialist): Promise<void> {
  try {
    await prisma.notificationLog.deleteMany({
      where: { appointmentId: appointment.id, type: "reminder", status: "queued" },
    });
    if (!hasFullAccess(specialist)) return;
    await enqueueReminderIfNeeded(appointment);
  } catch (err) {
    console.error("[notifications] failed to reschedule reminder notification:", err);
  }
}

/**
 * Called after a cancellation — drops any not-yet-sent notification for
 * that appointment so a reminder never fires for a cancelled booking.
 * Already-sent/failed rows are left alone as the audit trail.
 */
export async function cancelPendingNotifications(appointmentId: string): Promise<void> {
  try {
    await prisma.notificationLog.deleteMany({
      where: { appointmentId, status: "queued" },
    });
  } catch (err) {
    console.error("[notifications] failed to cancel pending notifications:", err);
  }
}
