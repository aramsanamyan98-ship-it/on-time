import { getTranslations } from "next-intl/server";
import {
  COMMITMENT_MONTHS_OPTIONS,
  SUBSCRIPTION_PRICE_PER_MONTH_AMD,
  totalBilledAmd,
  type CommitmentMonths,
} from "@/lib/subscription/pricing";

const CONTACT_EMAIL = "hello@ontime.am";

const COMMITMENT_LABEL_KEY: Record<
  CommitmentMonths,
  "commitmentLabelMonthly" | "commitmentLabel3" | "commitmentLabel6" | "commitmentLabel12"
> = {
  1: "commitmentLabelMonthly",
  3: "commitmentLabel3",
  6: "commitmentLabel6",
  12: "commitmentLabel12",
};

/**
 * 02_PRD.md Section 14: the four commitment-length options (price-per-month
 * + total billed upfront), shared between the Plan page (for an
 * already-active specialist) and the dashboard's blocked "subscribe to
 * continue" state — the two places a specialist needs to see pricing.
 * Real billing isn't automated yet (02_PRD.md Section 14), so this ends in
 * a mailto placeholder rather than a checkout flow, the same pattern the
 * old tier-upgrade CTA used.
 */
export async function CommitmentOptions({
  locale,
  currentCommitmentMonths = null,
}: {
  locale: string;
  currentCommitmentMonths?: CommitmentMonths | null;
}) {
  const t = await getTranslations("Subscription");
  const formatAmd = (amount: number) => new Intl.NumberFormat(locale).format(amount);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {COMMITMENT_MONTHS_OPTIONS.map((months) => {
          const isCurrent = currentCommitmentMonths === months;
          return (
            <div
              key={months}
              className={`flex flex-col gap-1 rounded-lg border p-4 ${
                isCurrent ? "border-brand-gold bg-brand-warm-white" : "border-brand-charcoal/10 bg-brand-warm-white"
              }`}
            >
              <h3 className="font-semibold text-brand-charcoal">{t(COMMITMENT_LABEL_KEY[months])}</h3>
              <p className="body-text text-sm font-medium text-brand-charcoal">
                {t("planPriceMonthly", { price: formatAmd(SUBSCRIPTION_PRICE_PER_MONTH_AMD[months]) })}
              </p>
              {months > 1 && (
                <p className="body-text text-xs">
                  {t("planPriceTotalBilled", { price: formatAmd(totalBilledAmd(months)) })}
                </p>
              )}
              {isCurrent && <p className="text-xs font-medium text-brand-gold-hover">{t("currentPlanBadge")}</p>}
            </div>
          );
        })}
      </div>
      <a
        href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t("contactSubject"))}`}
        className="btn-accent w-fit"
      >
        {t("contactToSubscribe")}
      </a>
    </div>
  );
}
