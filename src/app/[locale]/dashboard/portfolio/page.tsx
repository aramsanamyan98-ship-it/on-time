import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { requireSpecialist } from "@/lib/dashboard/require-specialist";
import { prisma } from "@/lib/prisma";
import { PortfolioUploadForm } from "./PortfolioUploadForm";
import { PortfolioPhotoCard } from "./PortfolioPhotoCard";
import { PageHeading } from "@/components/Heading";

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const specialist = await requireSpecialist(locale as AppLocale);
  const t = await getTranslations("Portfolio");

  const photos = await prisma.portfolioPhoto.findMany({
    where: { specialistId: specialist.id },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <PageHeading>{t("title")}</PageHeading>
        <p className="body-text mt-2 text-sm">{t("subtitle")}</p>
      </div>

      <PortfolioUploadForm />

      {photos.length === 0 ? (
        <p className="body-text text-sm">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <PortfolioPhotoCard
              key={photo.id}
              photo={{ id: photo.id, imageUrl: photo.imageUrl }}
              isFirst={index === 0}
              isLast={index === photos.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
