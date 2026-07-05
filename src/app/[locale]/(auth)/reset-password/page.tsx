import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { checkResetToken } from "@/lib/auth/reset-password";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { token } = await searchParams;
  const isValid = Boolean(token) && (await checkResetToken(token!));

  if (!token || !isValid) {
    const t = await getTranslations("Auth.resetPassword");
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-brand-charcoal">{t("invalidTokenTitle")}</h1>
        <p className="text-sm text-brand-charcoal/70">{t("invalidTokenMessage")}</p>
        <Link href="/forgot-password" className="text-sm font-medium text-brand-green underline">
          {t("requestNewLink")}
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
