import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { utcToZonedDateStr } from "@/lib/booking/timezone";
import { ManualBookingForm } from "./ManualBookingForm";

export default async function NewAppointmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("Appointments");

  const services = await prisma.service.findMany({
    where: { specialistId: specialist.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-charcoal">{t("newAppointmentTitle")}</h1>
        <p className="mt-1 text-sm text-brand-charcoal/70">{t("newAppointmentSubtitle")}</p>
      </div>

      {services.length === 0 ? (
        <p className="text-sm text-brand-charcoal/70">{t("noActiveServices")}</p>
      ) : (
        <ManualBookingForm
          timezone={specialist.timezone}
          locale={locale}
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            durationMinutes: s.durationMinutes,
            priceAmd: s.priceAmd,
          }))}
          initialDateStr={utcToZonedDateStr(new Date(), specialist.timezone)}
        />
      )}
    </div>
  );
}
