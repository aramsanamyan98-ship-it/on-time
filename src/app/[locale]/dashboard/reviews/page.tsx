import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { hasFullAccess } from "@/lib/subscription/trial";
import { getReviewStats, listReviewsForDashboard } from "@/lib/reviews/queries";
import { StarRating } from "@/components/StarRating";
import { PageHeading } from "@/components/Heading";

// 08_Roadmap.md Phase 9: a specialist can always see every review left for
// them, on any plan — only the *public* profile display is Starter+ gated
// (see src/app/[locale]/book/[slug]/page.tsx). Reviews can never be
// deleted or hidden from here (02_PRD.md Section 14) — this page has no
// delete/hide action at all, by design, to preserve trust in the system.
export default async function ReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("Reviews");

  const [stats, reviews] = await Promise.all([
    getReviewStats(specialist.id),
    listReviewsForDashboard(specialist.id),
  ]);

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: specialist.timezone,
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeading>{t("title")}</PageHeading>

      {stats.count > 0 && stats.average !== null && (
        <div className="flex items-center gap-2">
          <StarRating value={stats.average} className="text-lg" ariaLabel={t("ratingAriaLabel", { rating: stats.average.toFixed(1) })} />
          <span className="font-semibold text-brand-charcoal">{stats.average.toFixed(1)}</span>
          <span className="body-text text-sm">{t("reviewCount", { count: stats.count })}</span>
        </div>
      )}

      {!hasFullAccess(specialist) && (
        <p className="rounded-md bg-brand-charcoal/5 px-4 py-3 text-sm text-brand-charcoal">{t("upgradeNote")}</p>
      )}

      {reviews.length === 0 ? (
        <p className="body-text text-sm">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <div key={review.id} className="surface-card flex flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StarRating value={review.rating} ariaLabel={t("ratingAriaLabel", { rating: review.rating })} />
                <span className="text-xs text-brand-charcoal/50">{dateFormatter.format(review.createdAt)}</span>
              </div>
              {review.comment && <p className="body-text text-sm">{review.comment}</p>}
              <p className="text-xs text-brand-charcoal/60">
                {review.guestName} · {review.serviceName} · {dateFormatter.format(review.appointmentDate)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
