import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { Link } from "@/i18n/navigation";
import { listClients } from "@/lib/dashboard/clients";
import { PageHeading } from "@/components/Heading";

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("Clients");

  const clients = await listClients(specialist.id);
  clients.sort((a, b) => b.lastVisit.getTime() - a.lastVisit.getTime());

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: specialist.timezone,
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeading>{t("title")}</PageHeading>

      {clients.length === 0 ? (
        <p className="body-text text-sm">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {clients.map((client) => (
            <Link
              key={client.guestPhone}
              href={`/dashboard/clients/${encodeURIComponent(client.guestPhone)}`}
              className="surface-card flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-medium text-brand-charcoal">{client.guestName}</p>
                <p className="text-xs text-brand-charcoal/60">
                  {client.guestPhone}
                  {client.guestEmail ? ` · ${client.guestEmail}` : ""}
                </p>
              </div>
              <div className="body-text text-right text-sm">
                <p>{t("appointmentCount", { count: client.appointmentCount })}</p>
                <p className="text-xs text-brand-charcoal/50">
                  {t("lastVisit", { date: dateFormatter.format(client.lastVisit) })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
