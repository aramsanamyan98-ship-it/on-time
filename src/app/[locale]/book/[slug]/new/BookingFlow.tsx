import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { utcToZonedDateStr } from "@/lib/booking/timezone";
import { isSlotAvailable } from "@/lib/booking/slots";
import { hasActiveAccess } from "@/lib/subscription/trial";
import { BookingWizard } from "./BookingWizard";
import { isReachable, loadBookingSpecialist } from "./booking-data";
import {
  getSlotsForDateAction,
  getDayAvailabilityAction,
  getEarliestAvailableAction,
  createBookingAction,
  createBookingInPlaceAction,
  getLoyaltyProgressAction,
} from "./actions";

/**
 * The booking wizard with its server-side preparation (services, deep-link
 * validation, access gate), shared by the full page and the popup. `mode`
 * only decides what happens after a successful booking: the full page
 * redirects to the manage page, the popup shows its own Confirmed step.
 */
export async function BookingFlow({
  slug,
  locale,
  mode,
  searchParams,
}: {
  slug: string;
  locale: string;
  mode: "page" | "popup";
  searchParams: { service?: string; start?: string };
}) {
  const specialist = await loadBookingSpecialist(slug);
  // Same "unreachable the moment a specialist is unverified/deactivated"
  // rule as the public profile page (07_Business_Rules.md).
  if (!isReachable(specialist)) notFound();

  const services = await prisma.service.findMany({
    where: { specialistId: specialist.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const t = await getTranslations("Booking");
  const tErrors = await getTranslations("Booking.errors");

  // 02_PRD.md Section 14: a specialist with no active trial/subscription
  // stops accepting new bookings — the page stays reachable, but shows this
  // message instead of the wizard (the real gate is the server action check
  // in createGuestBooking).
  if (!hasActiveAccess(specialist)) return <p className="body-text">{tErrors("notAcceptingBookings")}</p>;
  if (services.length === 0) return <p className="body-text">{t("noServicesAvailable")}</p>;

  // Rebook-reminder email links land here with `?service=<id>` to
  // pre-select the guest's previous service (src/lib/notifications/send.ts)
  // — validated against this specialist's own active services rather than
  // trusted outright, the same trust boundary createGuestBooking applies to
  // a serviceId arriving from the booking form.
  const initialServiceId = services.some((s) => s.id === searchParams.service) ? (searchParams.service as string) : null;

  // Story links and the profile's free-time buttons add `&start=<ISO instant>`
  // to pre-select a time too (src/lib/booking/slot-link.ts). The slot is
  // re-checked against live availability here — the same check every booking
  // path uses — and if it's gone the wizard falls back to the normal time
  // picker (opened on that day) with a notice. createGuestBooking still
  // re-validates on submit.
  const requestedStart = searchParams.start ? new Date(searchParams.start) : null;
  const initialService = services.find((s) => s.id === initialServiceId);
  const todayDateStr = utcToZonedDateStr(new Date(), specialist.timezone);
  let initialSlotIso: string | null = null;
  let initialSlotTaken = false;
  let initialDateStr = todayDateStr;
  if (initialService && requestedStart && !Number.isNaN(requestedStart.getTime())) {
    if (await isSlotAvailable(specialist, initialService.durationMinutes, requestedStart)) {
      initialSlotIso = requestedStart.toISOString();
    } else {
      initialSlotTaken = true;
    }
    const requestedDateStr = utcToZonedDateStr(requestedStart, specialist.timezone);
    if (requestedDateStr > initialDateStr) initialDateStr = requestedDateStr;
  }

  return (
    <BookingWizard
      specialistId={specialist.id}
      specialist={{ name: specialist.displayName, address: specialist.address }}
      timezone={specialist.timezone}
      locale={locale}
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        priceAmd: s.priceAmd,
      }))}
      todayDateStr={todayDateStr}
      initialDateStr={initialDateStr}
      initialServiceId={initialServiceId}
      initialSlotIso={initialSlotIso}
      initialSlotTaken={initialSlotTaken}
      getSlotsForDateAction={getSlotsForDateAction}
      getDayAvailabilityAction={getDayAvailabilityAction}
      getEarliestAvailableAction={getEarliestAvailableAction}
      createBookingAction={mode === "popup" ? createBookingInPlaceAction : createBookingAction}
      getLoyaltyProgressAction={getLoyaltyProgressAction}
    />
  );
}
