import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { AppointmentRow } from "./AppointmentRow";

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

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-brand-charcoal">{t("title")}</h1>
        <Link
          href="/dashboard/appointments/new"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          {t("addAppointment")}
        </Link>
      </div>

      {added === "1" && <p className="text-sm text-brand-green">{t("addedSuccess")}</p>}

      {appointments.length === 0 ? (
        <p className="text-sm text-brand-charcoal/70">{t("empty")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-brand-charcoal/10 rounded-lg border border-brand-charcoal/10">
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
    </div>
  );
}
