import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { utcToZonedDateStr } from "@/lib/booking/timezone";
import { BlockedTimeForm } from "./BlockedTimeForm";
import { BlockedTimeRow } from "./BlockedTimeRow";
import { PageHeading } from "@/components/Heading";

export default async function BlockedTimePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ added?: string; deleted?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const { added, deleted } = await searchParams;

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("BlockedTime");

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
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <PageHeading>{t("title")}</PageHeading>
        <p className="body-text mt-2 text-sm">{t("subtitle")}</p>
      </div>

      {added === "1" && <p className="text-sm text-brand-green">{t("addedSuccess")}</p>}
      {deleted === "1" && <p className="text-sm text-brand-green">{t("deletedSuccess")}</p>}

      <div className="panel">
        <BlockedTimeForm initialDateStr={utcToZonedDateStr(new Date(), specialist.timezone)} />
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-medium text-brand-charcoal">{t("upcomingTitle")}</p>
        {blockedTimes.length === 0 ? (
          <p className="body-text text-sm">{t("empty")}</p>
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
    </div>
  );
}
