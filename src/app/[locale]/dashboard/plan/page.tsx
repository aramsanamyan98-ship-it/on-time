import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { getPlanStatus } from "@/lib/subscription/status";
import type { CommitmentMonths } from "@/lib/subscription/pricing";
import { CommitmentOptions } from "./CommitmentOptions";
import { PageHeading, SectionHeading } from "@/components/Heading";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const status = getPlanStatus(specialist);
  const t = await getTranslations("Subscription");
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long" });

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeading>{t("title")}</PageHeading>

      <section className="panel flex flex-col gap-2">
        <SectionHeading>{t("currentPlanTitle")}</SectionHeading>
        {status.isTrialActive ? (
          <>
            <p className="font-medium text-brand-charcoal">{t("trialBadge")}</p>
            <p className="body-text text-sm">{t("trialDaysRemaining", { days: status.trialDaysRemaining })}</p>
            <p className="body-text text-sm">{t("trialFullAccessNote")}</p>
          </>
        ) : (
          <>
            <p className="font-medium text-brand-charcoal">{t("activeSubscriptionBadge")}</p>
            {status.subscriptionActiveUntil && (
              <p className="body-text text-sm">
                {t("activeSubscriptionUntil", { date: dateFormatter.format(status.subscriptionActiveUntil) })}
              </p>
            )}
          </>
        )}
      </section>

      <section className="panel flex flex-col gap-4">
        <SectionHeading>{t("commitmentOptionsTitle")}</SectionHeading>
        <CommitmentOptions
          locale={locale}
          currentCommitmentMonths={status.isTrialActive ? null : (status.subscriptionCommitmentMonths as CommitmentMonths | null)}
        />
      </section>
    </div>
  );
}
