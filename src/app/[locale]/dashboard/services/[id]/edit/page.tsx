import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { ServiceForm } from "../../ServiceForm";
import { updateServiceAction } from "../../actions";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("Services");

  const service = await prisma.service.findFirst({ where: { id, specialistId: specialist.id } });
  if (!service) notFound();

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold text-brand-charcoal">{t("editServiceTitle")}</h1>
      <ServiceForm
        action={updateServiceAction}
        serviceId={service.id}
        initialValues={{
          name: service.name,
          durationMinutes: String(service.durationMinutes),
          priceAmd: String(service.priceAmd),
          description: service.description ?? "",
        }}
      />
    </div>
  );
}
