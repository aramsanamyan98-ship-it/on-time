import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { ServiceRow } from "./ServiceRow";
import { PageHeading } from "@/components/Heading";

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
        <PageHeading>{t("title")}</PageHeading>
        <Link href="/dashboard/services/new" className="btn-primary">
          {t("addService")}
        </Link>
      </div>

      {services.length === 0 ? (
        <p className="body-text text-sm">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
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
