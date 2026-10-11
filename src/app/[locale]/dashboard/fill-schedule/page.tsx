import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { findOpenSlotsForServices } from "@/lib/booking/slots";
import { languageToRoutingLocale } from "@/lib/locale";
import { PageHeading } from "@/components/Heading";
import { FillScheduleClient } from "./FillScheduleClient";

export default async function FillSchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("FillSchedule");

  const services = await prisma.service.findMany({
    where: { specialistId: specialist.id, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, durationMinutes: true, priceAmd: true },
  });
  const suggestions = await findOpenSlotsForServices(specialist, services);

  // Only services that actually have an open slot are offered; each carries
  // its soonest slot first, then the spread-out alternatives.
  const options = services.flatMap((service) => {
    const suggestion = suggestions.get(service.id);
    if (!suggestion) return [];
    return [
      {
        id: service.id,
        name: service.name,
        slots: [suggestion.suggested, ...suggestion.alternatives].map((d) => d.toISOString()),
      },
    ];
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <PageHeading>{t("title")}</PageHeading>
        <p className="body-text mt-2 text-sm">{t("subtitle")}</p>
      </div>

      {services.length === 0 ? (
        <div className="panel">
          <p className="body-text text-sm">{t("noServices")}</p>
        </div>
      ) : options.length === 0 ? (
        <div className="panel flex flex-col gap-2">
          <h2 className="heading-section">{t("emptyTitle")}</h2>
          <p className="body-text text-sm">{t("emptyBody")}</p>
        </div>
      ) : (
        <FillScheduleClient
          services={options}
          timezone={specialist.timezone}
          slug={specialist.slug}
          baseUrl={process.env.APP_URL ?? ""}
          defaultLanguage={languageToRoutingLocale[specialist.languagePreference]}
        />
      )}
    </div>
  );
}
