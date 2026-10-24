import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { defaultSchedule, type DaySchedule } from "@/lib/working-hours/defaults";
import { utcToZonedDateStr } from "@/lib/booking/timezone";
import { WorkingHoursForm } from "./WorkingHoursForm";
import { BlockedTimeForm } from "../blocked-time/BlockedTimeForm";
import { BlockedTimeRow } from "../blocked-time/BlockedTimeRow";
import { PageHeading, SectionHeading } from "@/components/Heading";

export default async function WorkingHoursPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ blockedAdded?: string; blockedDeleted?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const { blockedAdded, blockedDeleted } = await searchParams;

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("WorkingHours");
  const tBlocked = await getTranslations("BlockedTime");

  const existing = await prisma.workingHours.findMany({ where: { specialistId: specialist.id } });
  const byDay = new Map(existing.map((row) => [row.dayOfWeek, row]));

  const schedule: DaySchedule[] = defaultSchedule().map((fallback) => {
    const row = byDay.get(fallback.dayOfWeek);
    if (!row) return fallback;
    return {
      dayOfWeek: fallback.dayOfWeek,
      isDayOff: row.isDayOff,
      startTime: row.startTime ?? fallback.startTime,
      endTime: row.endTime ?? fallback.endTime,
    };
  });

  // Blocked time (lunch, errands, time off) is managed here, next to the
  // weekly hours it carves time out of. It used to be its own page/tab.
  const blockedTimes = await prisma.blockedTime.findMany({
    where: { specialistId: specialist.id, endAt: { gt: new Date() } },
    orderBy: { startAt: "asc" },
  });
  const dayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: specialist.timezone,
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: specialist.timezone,
  });

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <div className="flex flex-col gap-6">
      <div>
        <PageHeading>{t("title")}</PageHeading>
        <p className="body-text mt-2 text-sm">{t("subtitle")}</p>
      </div>
      <div className="panel">
        <WorkingHoursForm initialSchedule={schedule} />
      </div>
      </div>

      <section id="blocked-time" aria-labelledby="blocked-time-title" className="flex scroll-mt-6 flex-col gap-6">
        <div>
          <SectionHeading>
            <span id="blocked-time-title">{tBlocked("title")}</span>
          </SectionHeading>
          <p className="body-text mt-2 text-sm">{tBlocked("subtitle")}</p>
        </div>

        {blockedAdded === "1" && <p className="text-sm text-brand-green">{tBlocked("addedSuccess")}</p>}
        {blockedDeleted === "1" && <p className="text-sm text-brand-green">{tBlocked("deletedSuccess")}</p>}

        <div className="panel">
          <BlockedTimeForm initialDateStr={utcToZonedDateStr(new Date(), specialist.timezone)} />
        </div>

        <div className="flex flex-col gap-3">
          <p className="font-medium text-brand-charcoal">{tBlocked("upcomingTitle")}</p>
          {blockedTimes.length === 0 ? (
            <p className="body-text text-sm">{tBlocked("empty")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {blockedTimes.map((blockedTime) => (
                <BlockedTimeRow
                  key={blockedTime.id}
                  blockedTime={{
                    id: blockedTime.id,
                    formattedRange: `${dayFormatter.format(blockedTime.startAt)} · ${timeFormatter.format(blockedTime.startAt)}–${timeFormatter.format(blockedTime.endAt)}`,
                    reason: blockedTime.reason,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
