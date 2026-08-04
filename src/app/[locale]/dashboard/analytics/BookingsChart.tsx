import type { DailyCount } from "@/lib/analytics/queries";

/** Parses a "YYYY-MM-DD" date string as a UTC calendar date, for display formatting only. */
function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// Dependency-free bar chart (no charting library anywhere else in this app —
// see StarRating.tsx) for the last-30-days bookings series. A single series
// of daily counts, so a single brand hue is enough; each bar keeps a 2px
// floor so every day still reads as a mark even at zero bookings, and the
// native `title` tooltip covers the "what's this bar" case without adding a
// client component.
export function BookingsChart({
  series,
  locale,
  timezone,
  ariaLabel,
  tooltipLabel,
}: {
  series: DailyCount[];
  locale: string;
  timezone: string;
  ariaLabel: string;
  tooltipLabel: (date: string, count: number) => string;
}) {
  const max = Math.max(1, ...series.map((day) => day.count));
  const dateFormatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: timezone });

  return (
    <div>
      <div className="flex h-28 items-end gap-[3px]" role="img" aria-label={ariaLabel}>
        {series.map((day) => (
          <div
            key={day.date}
            className="min-h-[2px] flex-1 rounded-t bg-brand-green/80"
            style={{ height: `${Math.round((day.count / max) * 100)}%` }}
            title={tooltipLabel(dateFormatter.format(parseDateStr(day.date)), day.count)}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-brand-charcoal/50">
        <span>{dateFormatter.format(parseDateStr(series[0].date))}</span>
        <span>{dateFormatter.format(parseDateStr(series[series.length - 1].date))}</span>
      </div>
    </div>
  );
}
