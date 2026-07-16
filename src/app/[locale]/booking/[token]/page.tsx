import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { utcToZonedDateStr } from "@/lib/booking/timezone";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { ManageBooking } from "./ManageBooking";
import {
  getRescheduleSlotsAction,
  getRescheduleEarliestAction,
  cancelBookingAction,
  rescheduleBookingAction,
} from "./actions";

// This is the private link sent in every guest booking confirmation
// (05_Database.md `booking_token`, 04_User_Flows.md Flow 4b): it doubles as
// the post-booking confirmation screen (justBooked=1) and the guest's
// permanent self-service view/cancel/reschedule page, since both are the
// same "here's your appointment" view with different banners on top.
export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ justBooked?: string; cancelled?: string; rescheduled?: string }>;
}) {
  const { locale, token } = await params;
  const sp = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const appointment = await prisma.appointment.findUnique({
    where: { bookingToken: token },
    include: { specialist: true, service: true },
  });
  if (!appointment) notFound();

  const t = await getTranslations("Booking");

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-brand-charcoal">{t("manageTitle")}</h1>
        <LanguageSwitcher />
      </div>
      <Link href={`/book/${appointment.specialist.slug}`} className="w-fit text-sm text-brand-charcoal/60 underline">
        &lsaquo; {t("backToProfile", { name: appointment.specialist.displayName })}
      </Link>
      <ManageBooking
        token={token}
        appointment={{
          status: appointment.status,
          serviceName: appointment.service.name,
          durationMinutes: appointment.service.durationMinutes,
          priceAmd: appointment.service.priceAmd,
          startAt: appointment.startAt.toISOString(),
          guestName: appointment.guestName,
          specialistName: appointment.specialist.displayName,
          timezone: appointment.specialist.timezone,
        }}
        locale={locale}
        justBooked={sp.justBooked === "1"}
        justCancelled={sp.cancelled === "1"}
        justRescheduled={sp.rescheduled === "1"}
        initialDateStr={utcToZonedDateStr(new Date(), appointment.specialist.timezone)}
        getSlotsForDateAction={getRescheduleSlotsAction}
        getEarliestAvailableAction={getRescheduleEarliestAction}
        cancelBookingAction={cancelBookingAction}
        rescheduleBookingAction={rescheduleBookingAction}
      />
    </div>
  );
}
