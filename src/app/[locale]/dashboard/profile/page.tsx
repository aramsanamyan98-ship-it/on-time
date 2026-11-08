import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { PhotoUploadForm } from "./PhotoUploadForm";
import { DisplayNameForm } from "./DisplayNameForm";
import { SlugForm } from "./SlugForm";
import { ProfileForm } from "./ProfileForm";
import { PageHeading, SectionHeading } from "@/components/Heading";
import { hasDisplayName, displayNameOrFallback } from "@/lib/profile/public-name";
import { getBookingBaseUrl } from "@/lib/booking/urls";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("Profile");
  const bookingBaseUrl = getBookingBaseUrl();

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeading>{t("title")}</PageHeading>

      <div className="panel">
        <DisplayNameForm displayName={specialist.displayName} />
      </div>

      <PhotoUploadForm kind="cover" initialUrl={specialist.coverPhotoUrl} />
      <PhotoUploadForm kind="profile" initialUrl={specialist.profilePhotoUrl} />

      <section className="panel flex flex-col gap-3">
        <SectionHeading>{t("publicLinkTitle")}</SectionHeading>
        <p className="body-text text-sm">{t("publicLinkHint")}</p>
        {!hasDisplayName(specialist.displayName) && (
          <p role="note" className="rounded-md bg-brand-gold-tint px-3 py-2 text-sm text-brand-charcoal">
            {t("pageHiddenNotice")}
          </p>
        )}
        <SlugForm
          slug={specialist.slug}
          baseUrl={bookingBaseUrl}
          shareTitle={displayNameOrFallback(specialist.displayName, "On-Time")}
        />
      </section>

      <div className="panel">
        <ProfileForm
          bio={specialist.bio ?? ""}
          phone={specialist.phone ?? ""}
          address={specialist.address ?? ""}
          instagramUrl={specialist.instagramUrl ?? ""}
          facebookUrl={specialist.facebookUrl ?? ""}
        />
      </div>
    </div>
  );
}
