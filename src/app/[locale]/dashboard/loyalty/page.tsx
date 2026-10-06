import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { PageHeading } from "@/components/Heading";
import { LoyaltyForm } from "./LoyaltyForm";

const DEFAULT_THRESHOLD = 5;

export default async function LoyaltyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("Loyalty");

  const existing = await prisma.loyaltyProgram.findUnique({ where: { specialistId: specialist.id } });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <PageHeading>{t("title")}</PageHeading>
        <p className="body-text mt-2 text-sm">{t("subtitle")}</p>
      </div>
      <div className="panel">
        <LoyaltyForm
          initialValues={{
            enabled: existing?.enabled ?? false,
            ruleType: existing?.ruleType ?? "everyNthFree",
            threshold: existing?.threshold ?? DEFAULT_THRESHOLD,
            rewardText: existing?.rewardText ?? "",
          }}
        />
      </div>
    </div>
  );
}
