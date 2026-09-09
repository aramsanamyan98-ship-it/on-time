import { getTranslations } from "next-intl/server";
import { CommitmentOptions } from "./plan/CommitmentOptions";
import { PageHeading } from "@/components/Heading";

/**
 * 02_PRD.md Section 14: replaces the normal dashboard (nav + page content)
 * entirely once a specialist's trial has ended with no active paid
 * subscription — a clear "subscribe to continue" state rather than a
 * degraded/limited dashboard. The public profile page stays reachable to
 * guests on its own (see book/[slug]/page.tsx); this only covers the
 * specialist-side dashboard/booking-management surface.
 */
export async function SubscribeToContinue({ locale }: { locale: string }) {
  const t = await getTranslations("Subscription");

  return (
    <div className="flex max-w-2xl flex-col gap-6 px-6 py-8">
      <PageHeading>{t("blockedTitle")}</PageHeading>
      <p className="body-text">{t("blockedMessage")}</p>
      <p className="body-text text-sm">{t("blockedPublicProfileNote")}</p>
      <CommitmentOptions locale={locale} />
    </div>
  );
}
