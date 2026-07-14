import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { ServiceRow } from "./ServiceRow";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("Services");

  const services = await prisma.service.findMany({
    where: { specialistId: specialist.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-brand-charcoal">{t("title")}</h1>
        <Link
          href="/dashboard/services/new"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          {t("addService")}
        </Link>
      </div>

      {services.length === 0 ? (
        <p className="text-sm text-brand-charcoal/70">{t("empty")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-brand-charcoal/10 rounded-lg border border-brand-charcoal/10">
          {services.map((service) => (
            <ServiceRow
              key={service.id}
              service={{
                id: service.id,
                name: service.name,
                durationMinutes: service.durationMinutes,
                priceAmd: service.priceAmd,
                isActive: service.isActive,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
