"use client";

import { useTranslations } from "next-intl";
import { logoutAction } from "./actions";

export function LogoutButton() {
  const t = useTranslations("Dashboard");

  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="btn-outline px-3 py-1.5"
      >
        {t("logout")}
      </button>
    </form>
  );
}
