import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { BookingFlow } from "../../new/BookingFlow";
import { BookingSheet } from "../../new/BookingSheet";
import { isReachable, loadBookingSpecialist } from "../../new/booking-data";

// Intercepts /[locale]/book/[slug]/new on in-app navigation and shows the same
// wizard as a popup over the profile page (the URL still changes, and Back
// closes it). A direct visit or refresh skips this and renders ../../new/page.
export default async function BookingPopupPage({
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
    <BookingSheet title={t("title", { name: specialist.displayName })}>
      <BookingFlow slug={slug} locale={locale} mode="popup" searchParams={sp} />
    </BookingSheet>
  );
}
