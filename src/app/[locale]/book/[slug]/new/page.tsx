import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { ProfileTopBar } from "../ProfileTopBar";
import { BookingFlow } from "./BookingFlow";
import { isReachable, loadBookingSpecialist } from "./booking-data";

// Full-page booking wizard: what a direct visit, a refresh, or a link from an
// Instagram Story / email lands on. Clicking Book/Select/a free time on the
// profile page opens the same wizard as a popup instead, via the intercepting
// route in ../@modal/(.)new.
export default async function NewBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ service?: string; start?: string }>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await loadBookingSpecialist(slug);
  if (!isReachable(specialist)) notFound();

  const t = await getTranslations("Booking");

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-brand-green px-4 pb-14 pt-3.5 lg:px-8">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <ProfileTopBar shareTitle={specialist.displayName} showShare={false} />
          <Link
            href={`/book/${specialist.slug}`}
            className="flex min-h-11 w-fit items-center text-sm font-semibold text-brand-cream/85 hover:text-brand-cream"
          >
            &lsaquo; {t("backToProfile", { name: specialist.displayName })}
          </Link>
          <h1 className="font-serif text-3xl font-bold leading-tight text-brand-cream [overflow-wrap:anywhere]">
            {t("title", { name: specialist.displayName })}
          </h1>
        </div>
      </header>

      <main className="mx-auto -mt-8 w-full max-w-xl px-4 pb-12">
        <div className="rounded-3xl border border-brand-card-border bg-white p-5 shadow-[0_8px_24px_rgba(31,61,43,0.10)]">
          <BookingFlow slug={slug} locale={locale} mode="page" searchParams={sp} />
        </div>
      </main>
    </div>
  );
}
