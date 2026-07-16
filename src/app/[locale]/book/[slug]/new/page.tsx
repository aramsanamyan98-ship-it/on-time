import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { utcToZonedDateStr } from "@/lib/booking/timezone";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BookingWizard } from "./BookingWizard";
import { getSlotsForDateAction, getEarliestAvailableAction, createBookingAction } from "./actions";

export default async function NewBookingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await prisma.specialist.findUnique({
    where: { slug },
    select: { id: true, displayName: true, timezone: true, emailVerifiedAt: true, deletedAt: true },
  });

  // Same "unreachable the moment a specialist is unverified/deactivated"
  // rule as the public profile page (07_Business_Rules.md).
  if (!specialist || !specialist.emailVerifiedAt || specialist.deletedAt) {
    notFound();
  }

  const services = await prisma.service.findMany({
    where: { specialistId: specialist.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const t = await getTranslations("Booking");

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-brand-charcoal">
          {t("title", { name: specialist.displayName })}
        </h1>
        <LanguageSwitcher />
      </div>

      {services.length === 0 ? (
        <p className="text-brand-charcoal/70">{t("noServicesAvailable")}</p>
      ) : (
        <BookingWizard
          specialistId={specialist.id}
          timezone={specialist.timezone}
          locale={locale}
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            durationMinutes: s.durationMinutes,
            priceAmd: s.priceAmd,
          }))}
          initialDateStr={utcToZonedDateStr(new Date(), specialist.timezone)}
          getSlotsForDateAction={getSlotsForDateAction}
          getEarliestAvailableAction={getEarliestAvailableAction}
          createBookingAction={createBookingAction}
        />
      )}
    </div>
  );
}
