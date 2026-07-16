import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { utcToZonedDateStr } from "@/lib/booking/timezone";
import { RescheduleForm } from "./RescheduleForm";

export default async function RescheduleAppointmentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("Appointments");

  const appointment = await prisma.appointment.findFirst({
    where: { id, specialistId: specialist.id, status: { not: "cancelled" } },
    include: { service: true },
  });
  if (!appointment) notFound();

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-charcoal">{t("rescheduleTitle")}</h1>
        <p className="mt-1 text-sm text-brand-charcoal/70">
          {appointment.service.name} — {appointment.guestName}
        </p>
      </div>
      <RescheduleForm
        appointmentId={appointment.id}
        timezone={specialist.timezone}
        locale={locale}
        initialDateStr={utcToZonedDateStr(new Date(), specialist.timezone)}
      />
    </div>
  );
}
