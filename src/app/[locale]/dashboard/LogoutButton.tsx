"use client";

import { useTranslations } from "next-intl";
import { logoutAction } from "./actions";

export function LogoutButton() {
  const t = useTranslations("Dashboard");

  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-md border border-brand-charcoal/20 px-3 py-1.5 text-sm font-medium text-brand-charcoal transition hover:border-brand-charcoal/40"
      >
        {t("logout")}
      </button>
    </form>
  );
}
