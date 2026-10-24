import { cache } from "react";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { loadSchedule } from "@/lib/working-hours/load-schedule";
import { getReviewStats, listReviewsForPublicProfile } from "@/lib/reviews/queries";
import { hasActiveAccess } from "@/lib/subscription/trial";
import { findNextFreeSlots } from "@/lib/booking/slots";
import { dayOfWeekFromDateStr, utcToZonedDateStr, utcToZonedTimeStr } from "@/lib/booking/timezone";
import {
  computeOpenStatus,
  formatAmount,
  groupHours,
  mapLinks,
  shortestService,
  slotDayKind,
  telHref,
} from "@/lib/booking/public-profile";
import type { DayOfWeek } from "@/lib/working-hours/defaults";
import { ProfileTopBar } from "./ProfileTopBar";
import { ProfileHero, heroIcons } from "./ProfileHero";
import {
  AboutSection,
  AddressHoursSection,
  LoyaltyCard,
  NextFreeTimes,
  ProfileFooter,
  ServicesSection,
  StickyBookBar,
  type NextSlot,
} from "./ProfileSections";
import { PortfolioGrid } from "./PortfolioGrid";
import { ReviewsList } from "./ReviewsList";

const sectionHeading = "font-serif text-2xl font-bold text-brand-green lg:text-[1.7rem]";

// Shared by generateMetadata and the page so the specialist is fetched once per request.
const loadSpecialist = cache((slug: string) =>
  prisma.specialist.findUnique({
    where: { slug },
    select: {
      id: true,
      displayName: true,
      profilePhotoUrl: true,
      coverPhotoUrl: true,
      bio: true,
      phone: true,
      address: true,
      instagramUrl: true,
      facebookUrl: true,
      timezone: true,
      emailVerifiedAt: true,
      deletedAt: true,
      trialEndsAt: true,
      subscriptionActiveUntil: true,
    },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const specialist = await loadSpecialist(slug);
  if (!specialist || !specialist.emailVerifiedAt || specialist.deletedAt) return {};

  const t = await getTranslations({ locale, namespace: "PublicProfile" });
  const services = await prisma.service.findMany({
    where: { specialistId: specialist.id, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { name: true },
    take: 4,
  });

  const title = t("metaTitle", { name: specialist.displayName });
  const description =
    services.length > 0
      ? t("metaDescription", { name: specialist.displayName, services: services.map((s) => s.name).join(", ") })
      : t("metaDescriptionNoServices", { name: specialist.displayName });
  const image = specialist.profilePhotoUrl ?? specialist.coverPhotoUrl;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      ...(image ? { images: [{ url: image, alt: specialist.displayName }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await loadSpecialist(slug);

  // A page must be unreachable the moment a specialist is unverified or
  // deactivated (07_Business_Rules.md, Specialist Account Rules) — no
  // bookings should ever be possible against it.
  if (!specialist || !specialist.emailVerifiedAt || specialist.deletedAt) {
    notFound();
  }

  // 02_PRD.md Section 14: the public profile itself stays reachable to
  // guests even once a specialist's trial/subscription lapses — only the
  // ability to book is gated (below).
  const canAcceptBookings = hasActiveAccess(specialist);
  const now = new Date();
  const timezone = specialist.timezone;

  const [services, schedule, portfolioPhotos, reviewStats, reviews, loyalty] = await Promise.all([
    prisma.service.findMany({
      where: { specialistId: specialist.id, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    loadSchedule(specialist.id),
    prisma.portfolioPhoto.findMany({
      where: { specialistId: specialist.id },
      orderBy: { sortOrder: "asc" },
    }),
    getReviewStats(specialist.id),
    listReviewsForPublicProfile(specialist.id),
    prisma.loyaltyProgram.findUnique({ where: { specialistId: specialist.id } }),
  ]);

  const t = await getTranslations("PublicProfile");
  const tHours = await getTranslations("WorkingHours");
  const tServices = await getTranslations("Services");

  const canBook = canAcceptBookings && services.length > 0;

  // "Next free times": the soonest spread-out slots for the shortest service.
  // A tapped slot opens the wizard on that service + time (slot-link params),
  // which re-checks it against live availability.
  const nextService = canBook ? shortestService(services) : null;
  const freeSlots = nextService ? await findNextFreeSlots(specialist, nextService.durationMinutes, undefined, now) : [];
  const slotDayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: timezone,
  });
  const nextSlots: NextSlot[] = freeSlots.map((slot) => {
    const kind = slotDayKind(slot, now, timezone);
    return {
      iso: slot.toISOString(),
      dayLabel: kind === "today" ? t("today") : kind === "tomorrow" ? t("tomorrow") : slotDayFormatter.format(slot),
      time: utcToZonedTimeStr(slot, timezone),
    };
  });

  // Open-now line, from the weekly schedule in the specialist's timezone.
  const status = computeOpenStatus(schedule, timezone, now);
  let statusText: string | null = null;
  if (status.kind === "open") {
    statusText = t("openUntil", { time: status.until });
  } else if (status.kind === "closed") {
    const { dayOffset, dayOfWeek, time } = status.opens;
    statusText =
      dayOffset === 0
        ? t("closedOpensToday", { time })
        : dayOffset === 1
          ? t("closedOpensTomorrow", { time })
          : t("closedOpensDay", { day: t(`daysShort.${dayOfWeek}`), time });
  } else {
    statusText = t("closedNow");
  }

  const address = specialist.address?.trim() || null;
  const links = address ? mapLinks(address) : null;

  const heroActions = [
    specialist.phone && {
      key: "phone",
      href: telHref(specialist.phone),
      label: t("callAction"),
      icon: heroIcons.phone,
    },
    specialist.instagramUrl && {
      key: "instagram",
      href: specialist.instagramUrl,
      label: "Instagram",
      icon: heroIcons.instagram,
      external: true,
    },
    specialist.facebookUrl && {
      key: "facebook",
      href: specialist.facebookUrl,
      label: "Facebook",
      icon: heroIcons.facebook,
      external: true,
    },
    links && {
      key: "directions",
      href: links.directions,
      label: t("directionsAction"),
      icon: heroIcons.directions,
      external: true,
    },
  ].filter((action): action is Exclude<typeof action, "" | null> => typeof action === "object" && action !== null);

  const todayDayOfWeek = dayOfWeekFromDateStr(utcToZonedDateStr(now, timezone)) as DayOfWeek;
  const hoursRows = groupHours(schedule, todayDayOfWeek).map((row) => {
    const first = tHours(`days.${row.days[0]}`);
    const last = tHours(`days.${row.days[row.days.length - 1]}`);
    return {
      isToday: row.isToday,
      isDayOff: row.isDayOff,
      startTime: row.startTime,
      endTime: row.endTime,
      label: row.days.length > 1 ? `${first} – ${last}` : first,
    };
  });

  const formatPrice = (amount: number) => t("priceAmd", { price: formatAmount(amount) });
  const serviceItems = services.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    durationLabel: tServices("durationValue", { minutes: service.durationMinutes }),
    priceLabel: formatPrice(service.priceAmd),
  }));

  const reviewDateFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const reviewItems = reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    authorName: review.firstName ?? t("anonymousReviewer"),
    serviceName: review.serviceName,
    dateLabel: reviewDateFormatter.format(review.createdAt),
  }));

  const hasRating = reviewStats.count > 0 && reviewStats.average !== null;
  const bio = specialist.bio?.trim() || null;
  const showStickyBar = canBook;
  const overlapsHero = canBook && nextSlots.length > 0;
  const lowestPrice = services.length > 0 ? Math.min(...services.map((s) => s.priceAmd)) : null;
  const firstSlot = nextSlots[0];

  return (
    <div className="flex flex-1 flex-col">
      <header className={`bg-brand-green px-4 ${overlapsHero ? "pb-20" : "pb-8"} pt-3.5 lg:px-8 lg:pb-16`}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-8">
          <ProfileTopBar shareTitle={specialist.displayName} />
          <ProfileHero
            name={specialist.displayName}
            photoUrl={specialist.profilePhotoUrl}
            rating={hasRating ? reviewStats.average : null}
            ratingLabel={hasRating ? t("ratingAriaLabel", { rating: reviewStats.average!.toFixed(1) }) : ""}
            reviewCountLabel={hasRating ? t("reviewCount", { count: reviewStats.count }) : null}
            address={address}
            statusText={statusText}
            isOpen={status.kind === "open"}
            actions={heroActions}
          />
        </div>
      </header>

      <main
        className={`mx-auto ${overlapsHero ? "-mt-12" : "mt-6"} flex w-full max-w-6xl flex-col gap-8 px-4 lg:-mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_23.75rem] lg:items-start lg:gap-x-8 lg:px-8 ${
          showStickyBar ? "pb-32 lg:pb-12" : "pb-10"
        }`}
      >
        {/* On phones these two wrappers are display:contents so every section
            is a direct flex child ordered by `order-*`; from lg up they become
            the main and side columns. */}
        <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:gap-8">
          {serviceItems.length > 0 && (
            <div className="order-3">
              <ServicesSection slug={slug} services={serviceItems} canBook={canBook} />
            </div>
          )}

          {portfolioPhotos.length > 0 && (
            <section aria-labelledby="portfolio-title" className="order-4 flex flex-col gap-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="portfolio-title" className={sectionHeading}>
                  {t("portfolioTitle")}
                </h2>
                {specialist.instagramUrl && (
                  <a
                    href={specialist.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center text-sm font-semibold text-brand-green hover:underline"
                  >
                    Instagram
                  </a>
                )}
              </div>
              <PortfolioGrid
                photos={portfolioPhotos.map((p) => ({ id: p.id, url: p.imageUrl }))}
                altText={t("portfolioPhotoAlt", { name: specialist.displayName })}
              />
            </section>
          )}

          {reviewItems.length > 0 && hasRating && (
            <section aria-labelledby="reviews-title" className="order-5 flex flex-col gap-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <h2 id="reviews-title" className={sectionHeading}>
                  {t("reviewsTitle")}
                </h2>
                <span className="text-sm text-brand-muted">
                  <strong className="text-brand-green">{reviewStats.average!.toFixed(1)}</strong> ·{" "}
                  {t("reviewsRealVisits", { count: reviewStats.count })}
                </span>
              </div>
              <ReviewsList reviews={reviewItems} />
            </section>
          )}

          {bio && (
            <div className="order-6">
              <AboutSection bio={bio} />
            </div>
          )}
        </div>

        <div className="contents lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-5">
          <div className="order-1">
            <NextFreeTimes slug={slug} slots={nextSlots} serviceId={nextService?.id ?? null} canBook={canBook} />
          </div>

          {loyalty?.enabled && (
            <div className="order-2">
              <LoyaltyCard
                ruleType={loyalty.ruleType}
                threshold={loyalty.threshold}
                rewardText={loyalty.rewardText}
              />
            </div>
          )}

          <div className="order-7">
            <AddressHoursSection address={address} rows={hoursRows} links={links} />
          </div>
        </div>

        <div className="order-8 lg:col-span-2">
          <ProfileFooter />
        </div>
      </main>

      {showStickyBar && lowestPrice !== null && (
        <StickyBookBar
          slug={slug}
          fromPriceLabel={t("fromPrice", { price: formatPrice(lowestPrice) })}
          nextFreeLabel={firstSlot ? t("nextFreeShort", { when: `${firstSlot.dayLabel} ${firstSlot.time}` }) : null}
        />
      )}
    </div>
  );
}
