import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { utcToZonedDateStr, addDaysToDateStr, zonedTimeToUtc } from "@/lib/booking/timezone";
import { AppointmentRow } from "./appointments/AppointmentRow";

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
      <div>
        <h1 className="text-2xl font-semibold text-brand-charcoal">
          {t("welcomeTitle", { name: specialist.displayName })}
        </h1>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/appointments/new"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          {tAppointments("addAppointment")}
        </Link>
        <Link
          href="/dashboard/services"
          className="rounded-md border border-brand-charcoal/20 px-4 py-2 text-sm font-medium text-brand-charcoal transition hover:border-brand-charcoal/40"
        >
          {t("manageServices")}
        </Link>
        <Link
          href="/dashboard/appointments"
          className="rounded-md border border-brand-charcoal/20 px-4 py-2 text-sm font-medium text-brand-charcoal transition hover:border-brand-charcoal/40"
        >
          {t("viewAllAppointments")}
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-brand-charcoal">{t("todayTitle")}</h2>
        {todayAppointments.length === 0 ? (
          <p className="text-sm text-brand-charcoal/70">{t("todayEmpty")}</p>
        ) : (
          <div className="flex flex-col divide-y divide-brand-charcoal/10 rounded-lg border border-brand-charcoal/10">
            {todayAppointments.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={toRowAppointment(appointment)} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-brand-charcoal">{t("upcomingTitle")}</h2>
        {upcomingAppointments.length === 0 ? (
          <p className="text-sm text-brand-charcoal/70">{t("upcomingEmpty")}</p>
        ) : (
          <div className="flex flex-col divide-y divide-brand-charcoal/10 rounded-lg border border-brand-charcoal/10">
            {upcomingAppointments.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={toRowAppointment(appointment)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
