import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { getPlanStatus } from "@/lib/subscription/status";
import { REFERRAL_BLOCK_SIZE, BOOKING_MILESTONE_COUNT } from "@/lib/subscription/trial";
import { ReferralBox } from "./ReferralBox";
import { InviteReferralForm } from "./InviteReferralForm";

const CONTACT_EMAIL = "hello@ontime.am";

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

  const planLabel =
    specialist.plan === "starter" ? t("planStarter") : specialist.plan === "pro" ? t("planPro") : t("planBasic");

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <h1 className="text-2xl font-semibold text-brand-charcoal">{t("title")}</h1>

      <section className="flex flex-col gap-2 rounded-lg border border-brand-charcoal/10 p-4">
        <h2 className="text-lg font-semibold text-brand-charcoal">{t("currentPlanTitle")}</h2>
        <p className="text-brand-charcoal">
          {status.isTrialActive ? t("trialBadge") : planLabel}
        </p>
        {status.isTrialActive && (
          <p className="text-sm text-brand-charcoal/70">
            {t("trialDaysRemaining", { days: status.trialDaysRemaining })}
          </p>
        )}
        {!status.isTrialActive && specialist.plan === "basic" && (
          <p className="text-sm text-brand-charcoal/70">{t("trialExpired")}</p>
        )}
        {status.basicMonthlyBookingsUsed !== null && (
          <p className="text-sm text-brand-charcoal/70">
            {t("basicUsage", { used: status.basicMonthlyBookingsUsed, limit: status.basicMonthlyBookingLimit })}
          </p>
        )}

        {!status.bookingMilestoneReached && (
          <p className="text-sm text-brand-charcoal/70">
            {t("bookingMilestoneProgress", { count: status.bookingCount, total: BOOKING_MILESTONE_COUNT })}
          </p>
        )}
        <p className="text-sm text-brand-charcoal/70">
          {t("referralProgress", { count: status.successfulReferralCount, block: REFERRAL_BLOCK_SIZE })}
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-brand-charcoal/10 p-4">
        <h2 className="text-lg font-semibold text-brand-charcoal">{t("referralLinkTitle")}</h2>
        <p className="text-sm text-brand-charcoal/70">{t("referralLinkHint")}</p>
        <ReferralBox link={referralLink} />
        <InviteReferralForm />
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-brand-charcoal/10 p-4">
        <h2 className="text-lg font-semibold text-brand-charcoal">{t("upgradeTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg border border-brand-charcoal/10 p-4">
            <h3 className="font-semibold text-brand-charcoal">{t("planStarter")}</h3>
            <p className="text-sm text-brand-charcoal/70">{t("starterPrice")}</p>
            <ul className="list-inside list-disc text-sm text-brand-charcoal/70">
              <li>{t("starterFeature1")}</li>
              <li>{t("starterFeature2")}</li>
              <li>{t("starterFeature3")}</li>
              <li>{t("starterFeature4")}</li>
              <li>{t("starterFeature5")}</li>
            </ul>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-brand-charcoal/10 p-4">
            <h3 className="font-semibold text-brand-charcoal">{t("planPro")}</h3>
            <p className="text-sm text-brand-charcoal/70">{t("proPrice")}</p>
            <ul className="list-inside list-disc text-sm text-brand-charcoal/70">
              <li>{t("proFeature1")}</li>
              <li>{t("proFeature2")}</li>
            </ul>
          </div>
        </div>
        {/* Real billing is out of scope for v1 (02_PRD.md Section 14) — a
            mailto placeholder stands in for what will later be a manual
            invoice/upgrade flow. */}
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t("contactSubject"))}`}
          className="w-fit rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-charcoal transition hover:opacity-90"
        >
          {t("contactToUpgrade")}
        </a>
      </section>
    </div>
  );
}
