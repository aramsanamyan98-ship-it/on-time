import "server-only";
import { sendEmail } from "@/lib/mailer";
import {
  buildBookingConfirmationEmail,
  buildReminderEmail,
  buildReviewRequestEmail,
  buildNewBookingAlertEmail,
  buildGuestCancelledAlertEmail,
  buildGuestRescheduledAlertEmail,
  type AppointmentEmailParams,
  type SpecialistAlertEmailParams,
} from "@/lib/email-templates";
import { languageToRoutingLocale } from "@/lib/locale";
import type { Appointment, NotificationLog, Specialist, Service } from "@/generated/prisma/client";
import type { AppLocale } from "@/i18n/routing";

type AppointmentWithRelations = Appointment & { specialist: Specialist; service: Service };

function formatAppointmentDateTime(date: Date, timezone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

function guestParams(appointment: AppointmentWithRelations, locale: AppLocale): AppointmentEmailParams {
  return {
    guestName: appointment.guestName,
    specialistName: appointment.specialist.displayName,
    serviceName: appointment.service.name,
    dateTime: formatAppointmentDateTime(appointment.startAt, appointment.specialist.timezone, locale),
    manageLink: `${process.env.APP_URL}/${locale}/booking/${appointment.bookingToken}`,
  };
}

function specialistParams(appointment: AppointmentWithRelations, locale: AppLocale): SpecialistAlertEmailParams {
  return {
    guestName: appointment.guestName,
    guestPhone: appointment.guestPhone,
    serviceName: appointment.service.name,
    dateTime: formatAppointmentDateTime(appointment.startAt, appointment.specialist.timezone, locale),
    dashboardLink: `${process.env.APP_URL}/${locale}/dashboard/appointments`,
  };
}

/**
 * Builds and sends one queued notification. Throws on failure so the
 * caller (src/lib/notifications/process.ts) can catch it per-row and
 * record the attempt — this function itself never touches the queue.
 * Guest-facing types use the guest's own booking-time locale; specialist-
 * facing types use the specialist's dashboard language — the two are
 * independent (02_PRD.md Section 2).
 */
export async function sendNotification(row: NotificationLog, appointment: AppointmentWithRelations): Promise<void> {
  if (row.channel !== "email") {
    // WhatsApp/Telegram/SMS aren't built yet (02_PRD.md Section 9) — any
    // row with a non-email channel is a bug elsewhere in the queue, not a
    // transient send failure, but it still fails loudly via the normal
    // retry/failed-status path rather than crashing the batch.
    throw new Error(`Unsupported notification channel: ${row.channel}`);
  }

  const guestLocale = languageToRoutingLocale[appointment.guestLocale];
  const specialistLocale = languageToRoutingLocale[appointment.specialist.languagePreference];

  let content;
  switch (row.type) {
    case "booking_confirmation":
      content = buildBookingConfirmationEmail(guestLocale, guestParams(appointment, guestLocale));
      break;
    case "reminder":
      content = buildReminderEmail(guestLocale, guestParams(appointment, guestLocale));
      break;
    case "review_request":
      content = buildReviewRequestEmail(guestLocale, guestParams(appointment, guestLocale));
      break;
    case "new_booking_alert":
      content = buildNewBookingAlertEmail(specialistLocale, specialistParams(appointment, specialistLocale));
      break;
    case "cancellation":
      content = buildGuestCancelledAlertEmail(specialistLocale, specialistParams(appointment, specialistLocale));
      break;
    case "reschedule_alert":
      content = buildGuestRescheduledAlertEmail(specialistLocale, specialistParams(appointment, specialistLocale));
      break;
    default:
      throw new Error(`No email template wired up for notification type: ${row.type}`);
  }

  await sendEmail({ to: row.recipient, subject: content.subject, html: content.html, text: content.text });
}
