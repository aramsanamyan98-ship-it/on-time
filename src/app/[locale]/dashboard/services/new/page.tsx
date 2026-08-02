import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { ServiceForm } from "../ServiceForm";
import { createServiceAction } from "../actions";
import { PageHeading } from "@/components/Heading";

export default async function NewServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("Services");

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <PageHeading>{t("addServiceTitle")}</PageHeading>
      <div className="panel">
        <ServiceForm action={createServiceAction} />
      </div>
    </div>
  );
}
