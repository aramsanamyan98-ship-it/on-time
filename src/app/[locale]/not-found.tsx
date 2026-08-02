import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h1 className="heading-page">{t("title")}</h1>
      <span className="heading-accent mx-auto" aria-hidden="true" />
      <p className="body-text max-w-prose">{t("message")}</p>
      <Link href="/" className="text-sm font-medium text-brand-green underline">
        {t("homeLink")}
      </Link>
    </div>
  );
}
