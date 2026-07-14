import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { defaultSchedule, type DaySchedule } from "@/lib/working-hours/defaults";
import { WorkingHoursForm } from "./WorkingHoursForm";

export default async function WorkingHoursPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("WorkingHours");

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

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-charcoal">{t("title")}</h1>
        <p className="mt-1 text-sm text-brand-charcoal/70">{t("subtitle")}</p>
      </div>
      <WorkingHoursForm initialSchedule={schedule} />
    </div>
  );
}
