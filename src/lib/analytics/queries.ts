import { prisma } from "@/lib/prisma";
import type { Specialist } from "@/generated/prisma/client";
import { utcToZonedDateStr, zonedTimeToUtc, addDaysToDateStr, firstOfMonthDateStr } from "@/lib/booking/timezone";

const DAILY_SERIES_DAYS = 30;
const RATING_TREND_MONTHS = 6;

export type DailyCount = { date: string; count: number };

export type AnalyticsOverview = {
  bookingsThisMonth: number;
  bookingsLastMonth: number;
  dailySeries: DailyCount[];
  statusBreakdown: { completed: number; cancelled: number; noShow: number };
  mostBookedService: { name: string; count: number } | null;
};

/**
 * Starter+ analytics (02_PRD.md Section 14). Every figure is scoped to the
 * last 30 days (the chart's own window) except the month-over-month
 * comparison, which is explicitly calendar-month. "Bookings" excludes
 * cancelled appointments, the same convention
 * src/lib/subscription/trial.ts's countBookings uses; the status breakdown
 * is the one place cancelled still needs to be counted, so it's tallied
 * from the same fetch rather than a second query.
 */
export async function getAnalyticsOverview(specialist: Specialist): Promise<AnalyticsOverview> {
  const { id: specialistId, timezone } = specialist;
  const todayStr = utcToZonedDateStr(new Date(), timezone);

  const thisMonthStart = zonedTimeToUtc(firstOfMonthDateStr(todayStr, 0), "00:00", timezone);
  const nextMonthStart = zonedTimeToUtc(firstOfMonthDateStr(todayStr, 1), "00:00", timezone);
  const lastMonthStart = zonedTimeToUtc(firstOfMonthDateStr(todayStr, -1), "00:00", timezone);

  const seriesStartStr = addDaysToDateStr(todayStr, -(DAILY_SERIES_DAYS - 1));
  const seriesStart = zonedTimeToUtc(seriesStartStr, "00:00", timezone);
  const seriesEnd = zonedTimeToUtc(addDaysToDateStr(todayStr, 1), "00:00", timezone);

  const [bookingsThisMonth, bookingsLastMonth, recentAppointments] = await Promise.all([
    prisma.appointment.count({
      where: { specialistId, status: { not: "cancelled" }, startAt: { gte: thisMonthStart, lt: nextMonthStart } },
    }),
    prisma.appointment.count({
      where: { specialistId, status: { not: "cancelled" }, startAt: { gte: lastMonthStart, lt: thisMonthStart } },
    }),
    prisma.appointment.findMany({
      where: { specialistId, startAt: { gte: seriesStart, lt: seriesEnd } },
      select: { startAt: true, status: true, serviceId: true, service: { select: { name: true } } },
    }),
  ]);

  const dailyCounts = new Map<string, number>();
  const statusBreakdown = { completed: 0, cancelled: 0, noShow: 0 };
  const serviceCounts = new Map<string, { name: string; count: number }>();

  for (const appointment of recentAppointments) {
    if (appointment.status === "completed") statusBreakdown.completed += 1;
    else if (appointment.status === "cancelled") statusBreakdown.cancelled += 1;
    else if (appointment.status === "no_show") statusBreakdown.noShow += 1;

    if (appointment.status !== "cancelled") {
      const dateStr = utcToZonedDateStr(appointment.startAt, timezone);
      dailyCounts.set(dateStr, (dailyCounts.get(dateStr) ?? 0) + 1);

      const existingService = serviceCounts.get(appointment.serviceId);
      if (existingService) existingService.count += 1;
      else serviceCounts.set(appointment.serviceId, { name: appointment.service.name, count: 1 });
    }
  }

  const dailySeries: DailyCount[] = [];
  for (let i = 0; i < DAILY_SERIES_DAYS; i++) {
    const dateStr = addDaysToDateStr(seriesStartStr, i);
    dailySeries.push({ date: dateStr, count: dailyCounts.get(dateStr) ?? 0 });
  }

  let mostBookedService: { name: string; count: number } | null = null;
  for (const service of serviceCounts.values()) {
    if (!mostBookedService || service.count > mostBookedService.count) mostBookedService = service;
  }

  return { bookingsThisMonth, bookingsLastMonth, dailySeries, statusBreakdown, mostBookedService };
}

export type RepeatClientStats = { totalClients: number; repeatClients: number; repeatRatePercent: number };

/**
 * Pro tier (02_PRD.md Section 14): a lifetime rate, not scoped to the
 * 30-day window above — repeat behavior is a longer-horizon signal than a
 * monthly snapshot. Grouped by guest phone, the same identity key
 * src/lib/dashboard/clients.ts's listClients uses; every appointment counts
 * toward "has booked" regardless of status, since a later cancellation
 * doesn't erase that the client made a booking.
 */
export async function getRepeatClientStats(specialistId: string): Promise<RepeatClientStats> {
  const appointments = await prisma.appointment.findMany({
    where: { specialistId },
    select: { guestPhone: true },
  });

  const counts = new Map<string, number>();
  for (const appointment of appointments) {
    counts.set(appointment.guestPhone, (counts.get(appointment.guestPhone) ?? 0) + 1);
  }

  const totalClients = counts.size;
  let repeatClients = 0;
  for (const count of counts.values()) if (count > 1) repeatClients += 1;

  return {
    totalClients,
    repeatClients,
    repeatRatePercent: totalClients === 0 ? 0 : Math.round((repeatClients / totalClients) * 100),
  };
}

export type MonthlyRating = { month: string; average: number | null; count: number };

/**
 * Pro tier: average rating per calendar month, oldest first, for the most
 * recent RATING_TREND_MONTHS months — a simple trend rather than per-review
 * detail (already available on the Reviews page). Months with no reviews
 * still appear, with `average: null`, so the trend's shape (including gaps)
 * is visible rather than silently compressed.
 */
export async function getRatingTrend(specialist: Specialist): Promise<MonthlyRating[]> {
  const { id: specialistId, timezone } = specialist;
  const todayStr = utcToZonedDateStr(new Date(), timezone);
  const rangeStart = zonedTimeToUtc(firstOfMonthDateStr(todayStr, -(RATING_TREND_MONTHS - 1)), "00:00", timezone);

  const reviews = await prisma.review.findMany({
    where: { specialistId, createdAt: { gte: rangeStart } },
    select: { rating: true, createdAt: true },
  });

  const buckets = new Map<string, { sum: number; count: number }>();
  for (const review of reviews) {
    const monthKey = firstOfMonthDateStr(utcToZonedDateStr(review.createdAt, timezone), 0).slice(0, 7);
    const bucket = buckets.get(monthKey);
    if (bucket) {
      bucket.sum += review.rating;
      bucket.count += 1;
    } else {
      buckets.set(monthKey, { sum: review.rating, count: 1 });
    }
  }

  const trend: MonthlyRating[] = [];
  for (let i = -(RATING_TREND_MONTHS - 1); i <= 0; i++) {
    const monthKey = firstOfMonthDateStr(todayStr, i).slice(0, 7);
    const bucket = buckets.get(monthKey);
    trend.push({ month: monthKey, average: bucket ? bucket.sum / bucket.count : null, count: bucket?.count ?? 0 });
  }

  return trend;
}
