import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import Image from "next/image";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { loadSchedule } from "@/lib/working-hours/load-schedule";
import { getReviewStats, listReviewsForPublicProfile } from "@/lib/reviews/queries";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { PageHeading, SectionHeading } from "@/components/Heading";
import { StarRating } from "@/components/StarRating";
import { PhoneIcon, PinIcon, InstagramIcon, FacebookIcon } from "@/components/ContactIcons";

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { locale, slug } = await params;
  const { ref } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await prisma.specialist.findUnique({
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
      emailVerifiedAt: true,
      deletedAt: true,
    },
  });

  // A page must be unreachable the moment a specialist is unverified or
  // deactivated (07_Business_Rules.md, Specialist Account Rules) — no
  // bookings should ever be possible against it.
  if (!specialist || !specialist.emailVerifiedAt || specialist.deletedAt) {
    notFound();
  }

  // 02_PRD.md Section 14 / 08_Roadmap.md Phase 9: guest reviews are shown
  // on the public profile for every paid plan — a baseline Starter feature,
  // not gated by tier.
  const [services, schedule, portfolioPhotos, reviewStats, reviews] = await Promise.all([
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
  ]);

  const t = await getTranslations("PublicProfile");
  const tHours = await getTranslations("WorkingHours");
  const tServices = await getTranslations("Services");

  const reviewDateFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative">
        <div className="relative h-40 w-full overflow-hidden bg-brand-charcoal/10 sm:h-56">
          {specialist.coverPhotoUrl && (
            <Image
              src={specialist.coverPhotoUrl}
              alt=""
              fill
              sizes="100vw"
              priority
              className="object-cover"
            />
          )}
        </div>
        <div className="absolute right-4 top-4">
          <LanguageSwitcher />
        </div>
        <div className="absolute -bottom-10 left-6 h-20 w-20 overflow-hidden rounded-full border-4 border-brand-warm-white bg-brand-warm-white sm:h-28 sm:w-28">
          {specialist.profilePhotoUrl ? (
            <Image
              src={specialist.profilePhotoUrl}
              alt=""
              width={112}
              height={112}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-brand-charcoal/30">
              {specialist.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div
        className={`flex flex-col gap-8 px-6 pt-14 sm:pt-16 ${
          services.length > 0 ? "pb-24" : "pb-10"
        }`}
      >
        <div className="flex flex-col gap-3">
          <PageHeading>{specialist.displayName}</PageHeading>

          {reviewStats.count > 0 && reviewStats.average !== null && (
            <div className="flex items-center gap-2">
              <StarRating
                value={reviewStats.average}
                className="text-lg"
                ariaLabel={t("ratingAriaLabel", { rating: reviewStats.average.toFixed(1) })}
              />
              <span className="font-semibold text-brand-charcoal">{reviewStats.average.toFixed(1)}</span>
              <span className="body-text text-sm">{t("reviewCount", { count: reviewStats.count })}</span>
            </div>
          )}

          {specialist.bio && <p className="body-text max-w-prose">{specialist.bio}</p>}

          {services.length > 0 && (
            <Link
              href={ref ? `/book/${slug}/new?ref=${encodeURIComponent(ref)}` : `/book/${slug}/new`}
              className="btn-accent mt-2 w-fit"
            >
              {t("bookButton")}
            </Link>
          )}
        </div>

        {(specialist.phone || specialist.address || specialist.instagramUrl || specialist.facebookUrl) && (
          <section className="flex max-w-sm flex-col gap-3">
            <SectionHeading>{t("contactTitle")}</SectionHeading>
            <div className="panel flex flex-col gap-3">
              {specialist.phone && (
                <a
                  href={`tel:${specialist.phone}`}
                  className="flex items-center gap-3 text-sm text-brand-charcoal transition hover:text-brand-green"
                >
                  <PhoneIcon className="h-5 w-5 shrink-0 text-brand-gold" />
                  <span>{specialist.phone}</span>
                </a>
              )}
              {specialist.address && (
                <div className="flex items-center gap-3 text-sm text-brand-charcoal">
                  <PinIcon className="h-5 w-5 shrink-0 text-brand-gold" />
                  <span>{specialist.address}</span>
                </div>
              )}
              {(specialist.instagramUrl || specialist.facebookUrl) && (
                <div className="flex items-center gap-3 pt-1">
                  {specialist.instagramUrl && (
                    <a
                      href={specialist.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-charcoal/5 text-brand-charcoal transition hover:bg-brand-gold hover:text-brand-charcoal"
                    >
                      <InstagramIcon className="h-4 w-4" />
                    </a>
                  )}
                  {specialist.facebookUrl && (
                    <a
                      href={specialist.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-charcoal/5 text-brand-charcoal transition hover:bg-brand-gold hover:text-brand-charcoal"
                    >
                      <FacebookIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="flex flex-col gap-8">
            {reviewStats.count > 0 && (
              <section className="flex flex-col gap-3">
                <SectionHeading>{t("reviewsTitle")}</SectionHeading>
                <div className="flex flex-col gap-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="surface-card flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-4">
                        <StarRating
                          value={review.rating}
                          ariaLabel={t("ratingAriaLabel", { rating: review.rating })}
                        />
                        <span className="text-xs text-brand-charcoal/50">
                          {reviewDateFormatter.format(review.createdAt)}
                        </span>
                      </div>
                      {review.comment && <p className="body-text text-sm">{review.comment}</p>}
                      <span className="text-xs font-medium text-brand-charcoal/60">
                        {review.firstName ?? t("anonymousReviewer")}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="flex flex-col gap-3">
              <SectionHeading>{t("servicesTitle")}</SectionHeading>
              {services.length === 0 ? (
                <p className="body-text text-sm">{t("noServices")}</p>
              ) : (
                <div className="panel flex flex-col divide-y divide-brand-charcoal/10 p-0">
                  {services.map((service) => (
                    <div key={service.id} className="flex flex-col gap-0.5 px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-medium text-brand-charcoal">{service.name}</span>
                        <span className="body-text whitespace-nowrap text-sm">
                          {tServices("durationValue", { minutes: service.durationMinutes })} ·{" "}
                          {tServices("priceValue", { price: service.priceAmd })}
                        </span>
                      </div>
                      {service.description && (
                        <p className="text-sm text-brand-charcoal/60">{service.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="flex max-w-sm flex-col gap-3">
              <SectionHeading>{t("workingHoursTitle")}</SectionHeading>
              <div className="panel flex flex-col divide-y divide-brand-charcoal/10 p-0">
                {schedule.map((day) => (
                  <div key={day.dayOfWeek} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="text-brand-charcoal">{tHours(`days.${day.dayOfWeek}`)}</span>
                    <span className="body-text">
                      {day.isDayOff ? t("dayOff") : `${day.startTime} – ${day.endTime}`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {portfolioPhotos.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionHeading>{t("portfolioTitle")}</SectionHeading>
              {/* Real per-photo aspect ratios aren't stored, so a plain <img>
                  (rather than next/image, which needs known dimensions) lets
                  each thumbnail keep its natural proportions in the masonry
                  layout instead of being cropped to a fixed box. */}
              <div className="columns-2 gap-4">
                {portfolioPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="mb-4 break-inside-avoid overflow-hidden rounded-xl bg-brand-charcoal/5 shadow-sm transition hover:shadow-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.imageUrl} alt="" loading="lazy" className="w-full object-cover" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {services.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-charcoal/10 bg-brand-warm-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
            <span className="truncate text-sm font-medium text-brand-charcoal">{specialist.displayName}</span>
            <Link
              href={ref ? `/book/${slug}/new?ref=${encodeURIComponent(ref)}` : `/book/${slug}/new`}
              className="btn-accent shrink-0"
            >
              {t("bookButton")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
