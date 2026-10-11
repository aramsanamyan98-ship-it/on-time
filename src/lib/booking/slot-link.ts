import type { AppLocale } from "@/i18n/routing";

/** Query params the booking wizard (`/[locale]/book/[slug]/new`) reads to open pre-filled: `?service=<id>&start=<ISO instant>`. */
export const SLOT_LINK_SERVICE_PARAM = "service";
export const SLOT_LINK_START_PARAM = "start";

/**
 * Booking URL that opens the wizard on a specific service and start time.
 * The wizard re-checks the slot server-side on load and falls back to the
 * normal time picker if it's been taken, so a stale link is harmless.
 */
export function buildSlotBookingUrl(params: {
  baseUrl: string;
  locale: AppLocale;
  slug: string;
  serviceId: string;
  startAt: Date;
}): string {
  const query = new URLSearchParams({
    [SLOT_LINK_SERVICE_PARAM]: params.serviceId,
    [SLOT_LINK_START_PARAM]: params.startAt.toISOString(),
  });
  return `${params.baseUrl}/${params.locale}/book/${params.slug}/new?${query.toString()}`;
}
