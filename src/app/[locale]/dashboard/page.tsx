import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { utcToZonedDateStr, addDaysToDateStr, zonedTimeToUtc } from "@/lib/booking/timezone";
import { getReviewStats } from "@/lib/reviews/queries";
import { AppointmentRow } from "./appointments/AppointmentRow";
import { PageHeading, SectionHeading } from "@/components/Heading";
import { StarRating } from "@/components/StarRating";

// 02_PRD.md Section 13 / 04_User_Flows.md Flow 3: dashboard home shows
// today's appointments first, then the next 7 days. Both ranges are
// computed in the specialist's own timezone (05_Database.md: timestamps
// are UTC, timezone is only ever used for display/availability math), and
// deliberately don't filter out appointments whose start time has already
// passed today — the specialist still needs to see (and mark up) their
// whole day, not just what's left of it.
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("Dashboard");
  const tAppointments = await getTranslations("Appointments");
  const tReviews = await getTranslations("Reviews");

  // 08_Roadmap.md Phase 9: shown regardless of plan — a specialist can see
  // their own average rating even on Basic, where reviews still get
  // collected (see src/lib/notifications/queue.ts) but aren't yet shown
  // publicly (see src/app/[locale]/book/[slug]/page.tsx).
  const reviewStats = await getReviewStats(specialist.id);

  const todayStr = utcToZonedDateStr(new Date(), specialist.timezone);
  const todayStart = zonedTimeToUtc(todayStr, "00:00", specialist.timezone);
  const upcomingStart = zonedTimeToUtc(addDaysToDateStr(todayStr, 1), "00:00", specialist.timezone);
  const upcomingEnd = zonedTimeToUtc(addDaysToDateStr(todayStr, 8), "00:00", specialist.timezone);

  const [todayAppointments, upcomingAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        specialistId: specialist.id,
        status: { not: "cancelled" },
        startAt: { gte: todayStart, lt: upcomingStart },
      },
      include: { service: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        specialistId: specialist.id,
        status: { not: "cancelled" },
        startAt: { gte: upcomingStart, lt: upcomingEnd },
      },
      include: { service: true },
      orderBy: { startAt: "asc" },
    }),
  ]);

  // Formatted server-side (not passed as raw startAt + locale for the
  // client to format) so the hydrated output can never diverge from the
  // SSR HTML — see the comment in AppointmentRow.tsx.
  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: specialist.timezone,
  });

  function toRowAppointment(appointment: (typeof todayAppointments)[number]) {
    return {
      id: appointment.id,
      serviceName: appointment.service.name,
      formattedDateTime: dateTimeFormatter.format(appointment.startAt),
      guestName: appointment.guestName,
      guestPhone: appointment.guestPhone,
    };
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeading>{t("welcomeTitle", { name: specialist.displayName })}</PageHeading>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/appointments/new" className="btn-primary">
          {tAppointments("addAppointment")}
        </Link>
        <Link href="/dashboard/services" className="btn-outline">
          {t("manageServices")}
        </Link>
        <Link href="/dashboard/appointments" className="btn-outline">
          {t("viewAllAppointments")}
        </Link>
      </div>

      <Link href="/dashboard/reviews" className="surface-card flex w-fit items-center gap-3">
        {reviewStats.count > 0 && reviewStats.average !== null ? (
          <>
            <StarRating value={reviewStats.average} />
            <span className="text-sm font-medium text-brand-charcoal">
              {reviewStats.average.toFixed(1)} · {tReviews("reviewCount", { count: reviewStats.count })}
            </span>
          </>
        ) : (
          <span className="body-text text-sm">{tReviews("noneYet")}</span>
        )}
      </Link>

      <section className="flex flex-col gap-3">
        <SectionHeading>{t("todayTitle")}</SectionHeading>
        {todayAppointments.length === 0 ? (
          <p className="body-text text-sm">{t("todayEmpty")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {todayAppointments.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={toRowAppointment(appointment)} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading>{t("upcomingTitle")}</SectionHeading>
        {upcomingAppointments.length === 0 ? (
          <p className="body-text text-sm">{t("upcomingEmpty")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingAppointments.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={toRowAppointment(appointment)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
