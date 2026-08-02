import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { utcToZonedDateStr } from "@/lib/booking/timezone";
import { isAppointmentReviewable } from "@/lib/reviews/eligibility";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { ManageBooking } from "./ManageBooking";
import {
  getRescheduleSlotsAction,
  getRescheduleEarliestAction,
  cancelBookingAction,
  rescheduleBookingAction,
  submitReviewAction,
} from "./actions";
import { PageHeading } from "@/components/Heading";

// This is the private link sent in every guest booking confirmation
// (05_Database.md `booking_token`, 04_User_Flows.md Flow 4b): it doubles as
// the post-booking confirmation screen (justBooked=1) and the guest's
// permanent self-service view/cancel/reschedule page, since both are the
// same "here's your appointment" view with different banners on top.
export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ justBooked?: string; cancelled?: string; rescheduled?: string }>;
}) {
  const { locale, token } = await params;
  const sp = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const appointment = await prisma.appointment.findUnique({
    where: { bookingToken: token },
    include: { specialist: true, service: true },
  });
  if (!appointment) notFound();

  // 08_Roadmap.md Phase 9: the review section only ever shows once the
  // appointment is actually over, and reflects an already-submitted review
  // (if any) so reloading this link never shows the form again — see
  // src/lib/reviews/eligibility.ts.
  const existingReview = await prisma.review.findUnique({ where: { appointmentId: appointment.id } });

  const t = await getTranslations("Booking");

  // Formatted server-side (not passed as raw startAt + locale for the
  // client to format) so the hydrated output can never diverge from the
  // SSR HTML — see the comment in AppointmentRow.tsx.
  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: appointment.specialist.timezone,
  });

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <PageHeading>{t("manageTitle")}</PageHeading>
        <LanguageSwitcher />
      </div>
      <Link href={`/book/${appointment.specialist.slug}`} className="w-fit text-sm text-brand-charcoal/60 underline">
        &lsaquo; {t("backToProfile", { name: appointment.specialist.displayName })}
      </Link>
      <ManageBooking
        token={token}
        appointment={{
          status: appointment.status,
          serviceName: appointment.service.name,
          durationMinutes: appointment.service.durationMinutes,
          priceAmd: appointment.service.priceAmd,
          formattedDateTime: dateTimeFormatter.format(appointment.startAt),
          guestName: appointment.guestName,
          specialistName: appointment.specialist.displayName,
          timezone: appointment.specialist.timezone,
        }}
        locale={locale}
        justBooked={sp.justBooked === "1"}
        justCancelled={sp.cancelled === "1"}
        justRescheduled={sp.rescheduled === "1"}
        initialDateStr={utcToZonedDateStr(new Date(), appointment.specialist.timezone)}
        getSlotsForDateAction={getRescheduleSlotsAction}
        getEarliestAvailableAction={getRescheduleEarliestAction}
        cancelBookingAction={cancelBookingAction}
        rescheduleBookingAction={rescheduleBookingAction}
        canReview={isAppointmentReviewable(appointment)}
        initialReview={existingReview ? { rating: existingReview.rating, comment: existingReview.comment } : null}
        submitReviewAction={submitReviewAction}
      />
    </div>
  );
}
