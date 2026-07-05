import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "./LogoutButton";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) {
    return redirect({ href: "/login", locale });
  }

  const specialist = await prisma.specialist.findUnique({ where: { id: session.specialistId } });
  if (!specialist || !specialist.emailVerifiedAt || specialist.deletedAt) {
    return redirect({ href: "/login", locale });
  }

  const t = await getTranslations("Dashboard");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-brand-charcoal/10 px-6 py-4">
        <span className="text-lg font-semibold text-brand-green">{t("title")}</span>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-start gap-2 px-6 py-10">
        <h1 className="text-2xl font-semibold text-brand-charcoal">
          {t("welcomeTitle", { name: specialist.displayName })}
        </h1>
        <p className="max-w-prose text-brand-charcoal/70">{t("welcomeMessage")}</p>
      </main>
    </div>
  );
}
