import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { getPlanStatus } from "@/lib/subscription/status";
import { REFERRAL_BLOCK_SIZE } from "@/lib/subscription/trial";
import { PLAN_PRICE_AMD } from "@/lib/subscription/pricing";
import type { Plan } from "@/generated/prisma/client";
import { ReferralBox } from "./ReferralBox";
import { InviteReferralForm } from "./InviteReferralForm";
import { PageHeading, SectionHeading } from "@/components/Heading";

const CONTACT_EMAIL = "hello@ontime.am";

// 02_PRD.md Section 14 (updated): three paid tiers, monthly billing only.
// Reviews (08_Roadmap.md Phase 9) is back in Starter's bullet list now
// that it's built — see src/lib/reviews.
const PLAN_TIERS: { plan: Plan; nameKey: "planBasic" | "planStarter" | "planPro"; featureKeys: string[] }[] = [
  {
    plan: "basic",
    nameKey: "planBasic",
    featureKeys: ["basicFeature1", "basicFeature2", "basicFeature3", "basicFeature4"],
  },
  {
    plan: "starter",
    nameKey: "planStarter",
    featureKeys: ["starterFeature1", "starterFeature2", "starterFeature3", "starterFeature4", "starterFeature5"],
  },
  {
    plan: "pro",
    nameKey: "planPro",
    featureKeys: ["proFeature1", "proFeature2"],
  },
];

export default async function PlanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const status = await getPlanStatus(specialist);
  const t = await getTranslations("Subscription");

  const referralLink = `${process.env.APP_URL}/${locale}/book/${specialist.slug}?ref=${specialist.referralCode}`;
  const formatAmd = (amount: number) => new Intl.NumberFormat(locale).format(amount);

  const planLabel =
    specialist.plan === "starter" ? t("planStarter") : specialist.plan === "pro" ? t("planPro") : t("planBasic");

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeading>{t("title")}</PageHeading>

      <section className="panel flex flex-col gap-2">
        <SectionHeading>{t("currentPlanTitle")}</SectionHeading>
        <p className="font-medium text-brand-charcoal">
          {status.isTrialActive ? t("trialBadge") : planLabel}
        </p>
        {status.isTrialActive ? (
          <>
            <p className="body-text text-sm">
              {t("trialDaysRemaining", { days: status.trialDaysRemaining })}
            </p>
            <p className="body-text text-sm">{t("trialFullAccessNote")}</p>
          </>
        ) : (
          <p className="body-text text-sm">
            {t("planPriceMonthly", { price: formatAmd(status.currentPlanPriceAmd) })}
          </p>
        )}
        {status.basicPortfolioPhotosUsed !== null && (
          <p className="body-text text-sm">
            {t("basicPortfolioUsage", {
              used: status.basicPortfolioPhotosUsed,
              limit: status.basicPortfolioPhotoLimit,
            })}
          </p>
        )}
        <p className="body-text text-sm">
          {t("referralProgress", { count: status.successfulReferralCount, block: REFERRAL_BLOCK_SIZE })}
        </p>
      </section>

      <section className="panel flex flex-col gap-3">
        <SectionHeading>{t("referralLinkTitle")}</SectionHeading>
        <p className="body-text text-sm">{t("referralLinkHint")}</p>
        <ReferralBox link={referralLink} />
        <InviteReferralForm />
      </section>

      <section className="panel flex flex-col gap-4">
        <SectionHeading>{t("upgradeTitle")}</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-3">
          {PLAN_TIERS.map(({ plan, nameKey, featureKeys }) => {
            const isCurrent = !status.isTrialActive && specialist.plan === plan;
            return (
              <div
                key={plan}
                className={`flex flex-col gap-2 rounded-lg border p-4 ${
                  isCurrent ? "border-brand-gold bg-brand-warm-white" : "border-brand-charcoal/10 bg-brand-warm-white"
                }`}
              >
                <h3 className="font-semibold text-brand-charcoal">{t(nameKey)}</h3>
                <p className="body-text text-sm font-medium text-brand-charcoal">
                  {t("planPriceMonthly", { price: formatAmd(PLAN_PRICE_AMD[plan]) })}
                </p>
                <ul className="list-inside list-disc text-sm text-brand-charcoal/70">
                  {featureKeys.map((key) => (
                    <li key={key}>{t(key)}</li>
                  ))}
                </ul>
                {isCurrent && <p className="text-xs font-medium text-brand-gold-hover">{t("currentPlanBadge")}</p>}
              </div>
            );
          })}
        </div>
        {/* Real billing is out of scope for v1 (02_PRD.md Section 14) — a
            mailto placeholder stands in for what will later be a manual
            invoice/upgrade flow. */}
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t("contactSubject"))}`}
          className="btn-accent w-fit"
        >
          {t("contactToUpgrade")}
        </a>
      </section>
    </div>
  );
}
