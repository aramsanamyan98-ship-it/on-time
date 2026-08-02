import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import Image from "next/image";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { loadSchedule } from "@/lib/working-hours/load-schedule";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { PageHeading, SectionHeading } from "@/components/Heading";

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

  const [services, schedule, portfolioPhotos] = await Promise.all([
    prisma.service.findMany({
      where: { specialistId: specialist.id, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    loadSchedule(specialist.id),
    prisma.portfolioPhoto.findMany({
      where: { specialistId: specialist.id },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const t = await getTranslations("PublicProfile");
  const tHours = await getTranslations("WorkingHours");
  const tServices = await getTranslations("Services");

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

      <div className="flex flex-col gap-8 px-6 pb-10 pt-14 sm:pt-16">
        <div className="flex flex-col gap-3">
          <PageHeading>{specialist.displayName}</PageHeading>
          {specialist.bio && <p className="body-text max-w-prose">{specialist.bio}</p>}

          {(specialist.phone || specialist.address || specialist.instagramUrl) && (
            <div className="body-text flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {specialist.phone && (
                <a href={`tel:${specialist.phone}`} className="underline">
                  {specialist.phone}
                </a>
              )}
              {specialist.address && <span>{specialist.address}</span>}
              {specialist.instagramUrl && (
                <a
                  href={specialist.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Instagram
                </a>
              )}
            </div>
          )}

          {services.length > 0 && (
            <Link
              href={ref ? `/book/${slug}/new?ref=${encodeURIComponent(ref)}` : `/book/${slug}/new`}
              className="btn-accent mt-2 w-fit"
            >
              {t("bookButton")}
            </Link>
          )}
        </div>

        {portfolioPhotos.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeading>{t("portfolioTitle")}</SectionHeading>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {portfolioPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square overflow-hidden rounded-lg bg-brand-charcoal/5 shadow-sm"
                >
                  <Image
                    src={photo.imageUrl}
                    alt=""
                    width={200}
                    height={200}
                    className="h-full w-full object-cover"
                  />
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
            <div className="flex flex-col gap-3">
              {services.map((service) => (
                <div key={service.id} className="surface-card flex flex-col gap-1">
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

        <section className="flex flex-col gap-3">
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
    </div>
  );
}
