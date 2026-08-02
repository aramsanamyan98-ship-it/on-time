import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { CardHeading } from "@/components/Heading";

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Successful verification is handled by /api/auth/verify-email, which
  // redirects straight to the dashboard. Reaching this page means the
  // token was missing, invalid, or expired.
  const t = await getTranslations("Auth.verifyEmail");

  return (
    <div className="flex flex-col gap-4">
      <CardHeading>{t("invalidTitle")}</CardHeading>
      <p className="body-text text-sm">{t("invalidMessage")}</p>
      <Link href="/login" className="text-sm font-medium text-brand-green underline">
        {t("resendLink")}
      </Link>
    </div>
  );
}
