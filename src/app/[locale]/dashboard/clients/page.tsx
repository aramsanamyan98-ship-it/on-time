import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { Link } from "@/i18n/navigation";
import { listClients } from "@/lib/dashboard/clients";

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
      <h1 className="text-2xl font-semibold text-brand-charcoal">{t("title")}</h1>

      {clients.length === 0 ? (
        <p className="text-sm text-brand-charcoal/70">{t("empty")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-brand-charcoal/10 rounded-lg border border-brand-charcoal/10">
          {clients.map((client) => (
            <Link
              key={client.guestPhone}
              href={`/dashboard/clients/${encodeURIComponent(client.guestPhone)}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-brand-charcoal/5"
            >
              <div>
                <p className="text-sm font-medium text-brand-charcoal">{client.guestName}</p>
                <p className="text-xs text-brand-charcoal/60">
                  {client.guestPhone}
                  {client.guestEmail ? ` · ${client.guestEmail}` : ""}
                </p>
              </div>
              <div className="text-right text-sm text-brand-charcoal/70">
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
