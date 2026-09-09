import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { PhotoUploadForm } from "./PhotoUploadForm";
import { ProfileForm } from "./ProfileForm";
import { PublicLinkBox } from "./PublicLinkBox";
import { PageHeading, SectionHeading } from "@/components/Heading";

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
  const publicLink = `${process.env.APP_URL}/${locale}/book/${specialist.slug}`;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeading>{t("title")}</PageHeading>

      <PhotoUploadForm kind="cover" initialUrl={specialist.coverPhotoUrl} />
      <PhotoUploadForm kind="profile" initialUrl={specialist.profilePhotoUrl} />

      <section className="panel flex flex-col gap-3">
        <SectionHeading>{t("publicLinkTitle")}</SectionHeading>
        <p className="body-text text-sm">{t("publicLinkHint")}</p>
        <PublicLinkBox link={publicLink} />
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
