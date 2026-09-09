import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { ClientNoteForm } from "./ClientNoteForm";
import { PageHeading, SectionHeading } from "@/components/Heading";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; phone: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { locale, phone } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const { saved } = await searchParams;

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("Clients");
  const guestPhone = decodeURIComponent(phone);

  const [appointments, note] = await Promise.all([
    prisma.appointment.findMany({
      where: { specialistId: specialist.id, guestPhone },
      include: { service: true },
      orderBy: { startAt: "desc" },
    }),
    prisma.clientNote.findUnique({
      where: { specialistId_guestPhone: { specialistId: specialist.id, guestPhone } },
    }),
  ]);
  if (appointments.length === 0) notFound();

  const latest = appointments[0];

  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: specialist.timezone,
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/dashboard/clients" className="w-fit text-sm text-brand-charcoal/60 underline">
        {t("backToClients")}
      </Link>

      <div>
        <PageHeading>{latest.guestName}</PageHeading>
        <p className="body-text mt-2 text-sm">
          {guestPhone}
          {latest.guestEmail ? ` · ${latest.guestEmail}` : ""}
        </p>
      </div>

      <div className="panel">
        <ClientNoteForm guestPhone={guestPhone} initialNotes={note?.notes ?? ""} justSaved={saved === "1"} />
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeading>{t("historyTitle")}</SectionHeading>
        <div className="flex flex-col gap-3">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="surface-card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-brand-charcoal">
                  {dateTimeFormatter.format(appointment.startAt)}
                </p>
                <p className="body-text text-sm">{appointment.service.name}</p>
              </div>
              <span className="whitespace-nowrap rounded-full bg-brand-charcoal/5 px-3 py-1 text-xs font-medium text-brand-charcoal/70">
                {t(`status.${appointment.status}`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
