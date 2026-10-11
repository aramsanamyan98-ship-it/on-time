import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { utcToZonedDateStr } from "@/lib/booking/timezone";
import { isSlotAvailable } from "@/lib/booking/slots";
import { hasActiveAccess } from "@/lib/subscription/trial";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BookingWizard } from "./BookingWizard";
import {
  getSlotsForDateAction,
  getEarliestAvailableAction,
  createBookingAction,
  getLoyaltyProgressAction,
} from "./actions";
import { PageHeading } from "@/components/Heading";

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

  const specialist = await prisma.specialist.findUnique({
    where: { slug },
    select: {
      id: true,
      displayName: true,
      timezone: true,
      emailVerifiedAt: true,
      deletedAt: true,
      trialEndsAt: true,
      subscriptionActiveUntil: true,
    },
  });

  // Same "unreachable the moment a specialist is unverified/deactivated"
  // rule as the public profile page (07_Business_Rules.md).
  if (!specialist || !specialist.emailVerifiedAt || specialist.deletedAt) {
    notFound();
  }

  const services = await prisma.service.findMany({
    where: { specialistId: specialist.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  // Rebook-reminder email links land here with `?service=<id>` to
  // pre-select the guest's previous service (src/lib/notifications/send.ts)
  // — validated against this specialist's own active services rather than
  // trusted outright, the same trust boundary createGuestBooking applies to
  // a serviceId arriving from the booking form.
  const initialServiceId = services.some((s) => s.id === sp.service) ? (sp.service as string) : null;

  // "Fill my schedule" Story links add `&start=<ISO instant>` to pre-select a
  // time too (src/lib/booking/slot-link.ts). The slot is re-checked against
  // live availability here — the same check every booking path uses — and
  // if it's gone the wizard falls back to the normal time picker (opened on
  // that day) with a notice. createGuestBooking still re-validates on submit.
  const requestedStart = sp.start ? new Date(sp.start) : null;
  const initialService = services.find((s) => s.id === initialServiceId);
  let initialSlotIso: string | null = null;
  let initialSlotTaken = false;
  let initialDateStr = utcToZonedDateStr(new Date(), specialist.timezone);
  if (initialService && requestedStart && !Number.isNaN(requestedStart.getTime())) {
    if (await isSlotAvailable(specialist, initialService.durationMinutes, requestedStart)) {
      initialSlotIso = requestedStart.toISOString();
    } else {
      initialSlotTaken = true;
    }
    const requestedDateStr = utcToZonedDateStr(requestedStart, specialist.timezone);
    if (requestedDateStr > initialDateStr) initialDateStr = requestedDateStr;
  }

  const t = await getTranslations("Booking");
  const tErrors = await getTranslations("Booking.errors");

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <PageHeading>{t("title", { name: specialist.displayName })}</PageHeading>
        <LanguageSwitcher />
      </div>

      {/* 02_PRD.md Section 14: a specialist with no active trial/subscription
          stops accepting new bookings — the page stays reachable, but shows
          this message instead of the wizard (the real gate is the server
          action check in createGuestBooking). */}
      {!hasActiveAccess(specialist) ? (
        <p className="body-text">{tErrors("notAcceptingBookings")}</p>
      ) : services.length === 0 ? (
        <p className="body-text">{t("noServicesAvailable")}</p>
      ) : (
        <BookingWizard
          specialistId={specialist.id}
          timezone={specialist.timezone}
          locale={locale}
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            durationMinutes: s.durationMinutes,
            priceAmd: s.priceAmd,
          }))}
          initialDateStr={initialDateStr}
          initialServiceId={initialServiceId}
          initialSlotIso={initialSlotIso}
          initialSlotTaken={initialSlotTaken}
          getSlotsForDateAction={getSlotsForDateAction}
          getEarliestAvailableAction={getEarliestAvailableAction}
          createBookingAction={createBookingAction}
          getLoyaltyProgressAction={getLoyaltyProgressAction}
        />
      )}
    </div>
  );
}
