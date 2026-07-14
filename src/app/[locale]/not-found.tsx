import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-brand-charcoal">{t("title")}</h1>
      <p className="max-w-prose text-brand-charcoal/70">{t("message")}</p>
      <Link href="/" className="text-sm font-medium text-brand-green underline">
        {t("homeLink")}
      </Link>
    </div>
  );
}
