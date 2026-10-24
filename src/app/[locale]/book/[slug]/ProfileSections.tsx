import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CalendarIcon, ChevronRightIcon, ClockIcon, GiftIcon, NavigationIcon } from "./ProfileIcons";
import type { HoursRow } from "@/lib/booking/public-profile";

const sectionHeading = "font-serif text-2xl font-bold text-brand-green lg:text-[1.7rem]";
const card = "rounded-2xl border border-brand-card-border bg-white";

export type NextSlot = { iso: string; dayLabel: string; time: string };

/** "Next free times" card (side column on desktop, overlapping the hero on phones). Hidden on phones when there are no free times. */
export async function NextFreeTimes({
  slug,
  slots,
  serviceId,
  canBook,
}: {
  slug: string;
  slots: NextSlot[];
  serviceId: string | null;
  canBook: boolean;
}) {
  const t = await getTranslations("PublicProfile");
  const hasSlots = canBook && slots.length > 0 && serviceId !== null;

  return (
    <section
      aria-labelledby="next-times-title"
      className={`${hasSlots ? "flex" : "hidden lg:flex"} flex-col gap-3.5 rounded-[1.25rem] bg-white p-5 shadow-[0_8px_24px_rgba(31,61,43,0.10)]`}
    >
      {canBook ? (
        <>
          <div className="flex items-center justify-between">
            <h2 id="next-times-title" className="text-[1.0625rem] font-bold text-brand-charcoal">
              {t("nextTimesTitle")}
            </h2>
            <CalendarIcon className="h-[18px] w-[18px] text-brand-muted" />
          </div>

          {hasSlots && (
            <ul className="grid grid-cols-2 gap-2">
              {slots.map((slot, index) => (
                <li key={slot.iso}>
                  <Link
                    href={`/book/${slug}/new?service=${serviceId}&start=${encodeURIComponent(slot.iso)}`}
                    className={`flex min-h-14 flex-col items-center justify-center rounded-2xl border-[1.5px] leading-tight transition ${
                      index === 0
                        ? "border-brand-green bg-brand-green text-brand-cream hover:bg-brand-green-hover"
                        : "border-brand-sand bg-white text-brand-charcoal hover:border-brand-green"
                    }`}
                  >
                    <span className={`text-xs ${index === 0 ? "text-brand-cream/80" : "text-brand-muted"}`}>
                      {slot.dayLabel}
                    </span>
                    <span className="text-[1.0625rem] font-bold">{slot.time}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={`/book/${slug}/new`}
            className="hidden min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-gold px-5 text-base font-bold text-brand-green transition hover:bg-brand-gold-hover lg:flex"
          >
            <CalendarIcon className="h-[18px] w-[18px]" />
            {t("bookTime")}
          </Link>
          <Link
            href={`/book/${slug}/new`}
            className="flex min-h-11 items-center justify-center gap-1 self-center text-sm font-semibold text-brand-green hover:underline"
          >
            {t("seeAllTimes")}
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
          <p className="hidden text-center text-xs text-brand-muted lg:block">{t("footerPayment")}</p>
        </>
      ) : (
        <p className="text-sm text-brand-muted">{t("notAcceptingBookings")}</p>
      )}
    </section>
  );
}

export async function LoyaltyCard({
  ruleType,
  threshold,
  rewardText,
}: {
  ruleType: "everyNthFree" | "percentOffAfterN";
  threshold: number;
  rewardText: string;
}) {
  const t = await getTranslations("PublicProfile");
  const rule =
    ruleType === "everyNthFree"
      ? t("loyaltyEveryNth", { n: threshold, reward: rewardText })
      : t("loyaltyPercentAfter", { n: threshold, reward: rewardText });

  return (
    <section className="flex items-start gap-3.5 rounded-[1.25rem] border border-brand-gold-border bg-brand-gold-tint p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.875rem] bg-brand-gold text-brand-green">
        <GiftIcon className="h-[22px] w-[22px]" />
      </span>
      <div className="flex flex-col gap-0.5">
        <strong className="text-[0.9375rem] font-bold text-brand-green">{rule}</strong>
        <span className="text-[0.8125rem] text-brand-charcoal/80">{t("loyaltyNote")}</span>
      </div>
    </section>
  );
}

export type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  durationLabel: string;
  priceLabel: string;
};

export async function ServicesSection({
  slug,
  services,
  canBook,
}: {
  slug: string;
  services: ServiceItem[];
  canBook: boolean;
}) {
  const t = await getTranslations("PublicProfile");

  return (
    <section aria-labelledby="services-title" className="flex flex-col gap-3.5">
      <h2 id="services-title" className={sectionHeading}>
        {t("servicesAndPricesTitle")}
      </h2>
      <ul className="flex flex-col gap-3">
        {services.map((service) => (
          <li key={service.id} className={`${card} flex items-center gap-3 p-4`}>
            <div className="flex min-w-0 grow flex-col gap-1">
              <span className="text-base font-semibold text-brand-charcoal">{service.name}</span>
              <span className="flex items-center gap-1.5 text-[0.8125rem] text-brand-muted">
                <ClockIcon className="h-3.5 w-3.5" />
                {service.durationLabel}
              </span>
              {service.description && <span className="text-sm text-brand-muted">{service.description}</span>}
              <span className="mt-0.5 text-[1.0625rem] font-bold text-brand-green">{service.priceLabel}</span>
            </div>
            {canBook && (
              <Link
                href={`/book/${slug}/new?service=${service.id}`}
                aria-label={t("selectServiceNamed", { name: service.name })}
                className="flex min-h-11 shrink-0 items-center rounded-xl bg-brand-green px-[1.125rem] text-sm font-semibold text-brand-cream transition hover:bg-brand-green-hover"
              >
                {t("selectService")}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function AboutSection({ bio }: { bio: string }) {
  const t = await getTranslations("PublicProfile");
  return (
    <section aria-labelledby="about-title" className="flex flex-col gap-2.5">
      <h2 id="about-title" className={sectionHeading}>
        {t("aboutTitle")}
      </h2>
      <p className="max-w-prose whitespace-pre-line text-[0.9375rem] text-brand-charcoal/85">{bio}</p>
    </section>
  );
}

export type HoursDisplayRow = Pick<HoursRow, "isToday" | "isDayOff" | "startTime" | "endTime"> & { label: string };

export async function AddressHoursSection({
  address,
  rows,
  links,
}: {
  address: string | null;
  rows: HoursDisplayRow[];
  links: { google: string; yandex: string } | null;
}) {
  const t = await getTranslations("PublicProfile");

  return (
    <section aria-labelledby="hours-title" className="flex flex-col gap-3.5">
      <h2 id="hours-title" className={`${sectionHeading} lg:sr-only`}>
        {t("addressHoursTitle")}
      </h2>
      <div className={`${card} overflow-hidden`}>
        {address && (
          <>
            {/* Decorative placeholder only: no coordinates are stored, so the real map lives behind the buttons below. */}
            <div
              role="img"
              aria-label={t("mapAriaLabel")}
              className="flex h-36 items-center justify-center bg-[#e4ebe3] bg-[linear-gradient(#d3ded2_1px,transparent_1px),linear-gradient(90deg,#d3ded2_1px,transparent_1px)] bg-[length:28px_28px]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green text-brand-gold shadow-[0_6px_16px_rgba(31,61,43,0.3)]">
                <NavigationIcon className="h-[22px] w-[22px]" />
              </span>
            </div>
          </>
        )}
        <div className="flex flex-col gap-3.5 p-4">
          {address && <strong className="text-[0.9375rem] font-semibold text-brand-charcoal">{address}</strong>}

          <dl className="flex flex-col border-t border-brand-card-border">
            {rows.map((row) => (
              <div
                key={row.label}
                className={
                  row.isToday
                    ? "-mx-3 flex items-center justify-between gap-3 rounded-[0.625rem] bg-brand-gold-tint px-3 py-2.5 text-sm font-bold text-brand-green"
                    : `flex justify-between gap-3 border-b border-brand-card-border py-2.5 text-sm last:border-b-0 ${
                        row.isDayOff ? "text-brand-muted" : "text-brand-charcoal"
                      }`
                }
              >
                <dt>{row.isToday ? t("todayRow", { day: row.label }) : row.label}</dt>
                <dd className={row.isDayOff || row.isToday ? "" : "font-semibold"}>
                  {row.isDayOff ? t("dayOff") : `${row.startTime} – ${row.endTime}`}
                </dd>
              </div>
            ))}
          </dl>

          {links && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: links.google, label: t("googleMaps") },
                { href: links.yandex, label: t("yandexMaps") },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-brand-sand px-2 text-sm font-semibold text-brand-charcoal transition hover:border-brand-green"
                >
                  <NavigationIcon className="h-4 w-4" />
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export async function ProfileFooter() {
  const t = await getTranslations("PublicProfile");
  return (
    <footer className="flex flex-col items-center gap-1 pt-2 text-xs text-brand-muted lg:pt-6">
      <span>{t.rich("footerBooking", { brand: (chunks) => <strong className="text-brand-green">{chunks}</strong> })}</span>
      <span className="lg:hidden">{t("footerPayment")}</span>
    </footer>
  );
}

/** Phone-only sticky bar: lowest price, next free time and the main Book button. */
export async function StickyBookBar({
  slug,
  fromPriceLabel,
  nextFreeLabel,
}: {
  slug: string;
  fromPriceLabel: string;
  nextFreeLabel: string | null;
}) {
  const t = await getTranslations("PublicProfile");
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-brand-card-border bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(28,27,24,0.08)] lg:hidden">
      <div className="flex min-w-0 grow flex-col leading-snug">
        <strong className="text-base font-bold text-brand-green">{fromPriceLabel}</strong>
        {nextFreeLabel && <span className="truncate text-xs text-brand-muted">{nextFreeLabel}</span>}
      </div>
      <Link
        href={`/book/${slug}/new`}
        className="flex min-h-13 shrink-0 items-center gap-2 rounded-2xl bg-brand-gold px-5 text-base font-bold text-brand-green transition hover:bg-brand-gold-hover"
      >
        <CalendarIcon className="h-[18px] w-[18px]" />
        {t("bookTime")}
      </Link>
    </div>
  );
}
