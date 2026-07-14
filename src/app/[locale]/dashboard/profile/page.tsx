import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { PhotoUploadForm } from "./PhotoUploadForm";
import { ProfileForm } from "./ProfileForm";

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

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <h1 className="text-2xl font-semibold text-brand-charcoal">{t("title")}</h1>

      <PhotoUploadForm kind="cover" initialUrl={specialist.coverPhotoUrl} />
      <PhotoUploadForm kind="profile" initialUrl={specialist.profilePhotoUrl} />

      <ProfileForm
        bio={specialist.bio ?? ""}
        phone={specialist.phone ?? ""}
        address={specialist.address ?? ""}
        instagramUrl={specialist.instagramUrl ?? ""}
      />
    </div>
  );
}
