import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { AppointmentRow } from "./AppointmentRow";
import { MarkAppointmentsViewed } from "./MarkAppointmentsViewed";
import { AppointmentsView } from "./AppointmentsView";
import { loadCalendarRange } from "@/lib/dashboard/calendar-data";
import { initialCalendarRange } from "@/lib/dashboard/calendar";
import { PageHeading } from "@/components/Heading";

export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ added?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const { added } = await searchParams;

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("Appointments");

  const appointments = await prisma.appointment.findMany({
    where: { specialistId: specialist.id, status: { not: "cancelled" }, endAt: { gt: new Date() } },
    include: { service: true },
    orderBy: { startAt: "asc" },
  });

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

  // First calendar load is server-rendered for the current week; later
  // navigation fetches via getCalendarRangeAction.
  const initialRange = initialCalendarRange(new Date(), specialist.timezone);
  const [initialData, workingHours] = await Promise.all([
    loadCalendarRange(specialist.id, initialRange.from, initialRange.to),
    prisma.workingHours.findMany({
      where: { specialistId: specialist.id },
      select: { dayOfWeek: true, startTime: true, endTime: true, isDayOff: true },
    }),
  ]);

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <MarkAppointmentsViewed />
      <div className="flex items-center justify-between gap-4">
        <PageHeading>{t("title")}</PageHeading>
        <Link href="/dashboard/appointments/new" className="btn-primary">
          {t("addAppointment")}
        </Link>
      </div>

      {added === "1" && <p className="text-sm text-brand-green">{t("addedSuccess")}</p>}

      <AppointmentsView
        locale={locale as AppLocale}
        timeZone={specialist.timezone}
        workingHours={workingHours}
        initialData={initialData}
      >
        {appointments.length === 0 ? (
          <p className="body-text text-sm">{t("empty")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {appointments.map((appointment) => (
              <AppointmentRow
                key={appointment.id}
                appointment={{
                  id: appointment.id,
                  serviceName: appointment.service.name,
                  formattedDateTime: dateTimeFormatter.format(appointment.startAt),
                  guestName: appointment.guestName,
                  guestPhone: appointment.guestPhone,
                }}
              />
            ))}
          </div>
        )}
      </AppointmentsView>
    </div>
  );
}
