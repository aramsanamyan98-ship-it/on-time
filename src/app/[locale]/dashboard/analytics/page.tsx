import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { getAnalyticsOverview, getRepeatClientStats, getRatingTrend } from "@/lib/analytics/queries";
import { PageHeading, SectionHeading } from "@/components/Heading";
import { StarRating } from "@/components/StarRating";
import { BookingsChart } from "./BookingsChart";

// 02_PRD.md Section 14: full analytics (month-over-month, 30-day chart,
// status breakdown, most-booked service, repeat-client rate, rating trend,
// daily breakdown) is identical for every specialist who can reach this
// page at all — the dashboard layout already blocks the whole dashboard
// for anyone without active trial/subscription access, so there's no
// further per-feature gating here.
export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("Analytics");

  const [overview, repeatStats, ratingTrend] = await Promise.all([
    getAnalyticsOverview(specialist),
    getRepeatClientStats(specialist.id),
    getRatingTrend(specialist),
  ]);

  const numberFormatter = new Intl.NumberFormat(locale);
  const deltaFormatter = new Intl.NumberFormat(locale, { signDisplay: "exceptZero" });
  const monthDelta = overview.bookingsThisMonth - overview.bookingsLastMonth;

  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" });
  const formatMonthKey = (monthKey: string) => monthFormatter.format(new Date(`${monthKey}-01T00:00:00Z`));

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: specialist.timezone,
  });
  const parseDateStr = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeading>{t("title")}</PageHeading>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="panel flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-charcoal/50">{t("thisMonthLabel")}</p>
          <p className="text-3xl font-bold text-brand-charcoal">{numberFormatter.format(overview.bookingsThisMonth)}</p>
          <p className="body-text text-sm">
            {t("comparedToLastMonth", {
              delta: deltaFormatter.format(monthDelta),
              count: numberFormatter.format(overview.bookingsLastMonth),
            })}
          </p>
        </div>

        <div className="panel flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-charcoal/50">{t("mostBookedServiceTitle")}</p>
          {overview.mostBookedService ? (
            <>
              <p className="text-xl font-bold text-brand-charcoal">{overview.mostBookedService.name}</p>
              <p className="body-text text-sm">
                {t("mostBookedServiceCount", { count: numberFormatter.format(overview.mostBookedService.count) })}
              </p>
            </>
          ) : (
            <p className="body-text text-sm">{t("noDataYet")}</p>
          )}
        </div>
      </section>

      <section className="panel flex flex-col gap-3">
        <SectionHeading>{t("chartTitle")}</SectionHeading>
        <BookingsChart
          series={overview.dailySeries}
          locale={locale}
          timezone={specialist.timezone}
          ariaLabel={t("chartAriaLabel")}
          tooltipLabel={(date, count) => t("chartTooltip", { date, count })}
        />
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading>{t("statusBreakdownTitle")}</SectionHeading>
        <div className="grid grid-cols-3 gap-4">
          <div className="panel flex flex-col items-center gap-1 text-center">
            <p className="text-2xl font-bold text-brand-charcoal">{numberFormatter.format(overview.statusBreakdown.completed)}</p>
            <p className="body-text text-sm">{t("completed")}</p>
          </div>
          <div className="panel flex flex-col items-center gap-1 text-center">
            <p className="text-2xl font-bold text-brand-charcoal">{numberFormatter.format(overview.statusBreakdown.cancelled)}</p>
            <p className="body-text text-sm">{t("cancelled")}</p>
          </div>
          <div className="panel flex flex-col items-center gap-1 text-center">
            <p className="text-2xl font-bold text-brand-charcoal">{numberFormatter.format(overview.statusBreakdown.noShow)}</p>
            <p className="body-text text-sm">{t("noShow")}</p>
          </div>
        </div>
      </section>

      {repeatStats && ratingTrend && (
        <section className="flex flex-col gap-6 border-t border-brand-charcoal/10 pt-6">
          <SectionHeading>{t("moreInsightsTitle")}</SectionHeading>

          <div className="panel flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-charcoal/50">{t("repeatClientRateTitle")}</p>
            {repeatStats.totalClients === 0 ? (
              <p className="body-text text-sm">{t("noDataYet")}</p>
            ) : (
              <>
                <p className="text-3xl font-bold text-brand-charcoal">{repeatStats.repeatRatePercent}%</p>
                <p className="body-text text-sm">
                  {t("repeatClientRateDetail", {
                    repeat: numberFormatter.format(repeatStats.repeatClients),
                    total: numberFormatter.format(repeatStats.totalClients),
                  })}
                </p>
              </>
            )}
          </div>

          <div className="panel flex flex-col gap-3">
            <SectionHeading>{t("ratingTrendTitle")}</SectionHeading>
            {ratingTrend.every((month) => month.count === 0) ? (
              <p className="body-text text-sm">{t("noDataYet")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {ratingTrend.map((month) => (
                  <div key={month.month} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-brand-charcoal/70">{formatMonthKey(month.month)}</span>
                    {month.average !== null ? (
                      <span className="flex items-center gap-2">
                        <StarRating value={month.average} />
                        <span className="text-sm font-medium text-brand-charcoal">{month.average.toFixed(1)}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-brand-charcoal/40">{t("ratingTrendNoData")}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel flex flex-col gap-3">
            <SectionHeading>{t("dailyBreakdownTitle")}</SectionHeading>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-brand-charcoal/50">
                    <th className="py-1 font-medium">{t("dailyBreakdownDate")}</th>
                    <th className="py-1 text-right font-medium">{t("dailyBreakdownCount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...overview.dailySeries].reverse().map((day) => (
                    <tr key={day.date} className="border-t border-brand-charcoal/5">
                      <td className="py-1.5 text-brand-charcoal">{dateFormatter.format(parseDateStr(day.date))}</td>
                      <td className="py-1.5 text-right font-medium text-brand-charcoal">{numberFormatter.format(day.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
