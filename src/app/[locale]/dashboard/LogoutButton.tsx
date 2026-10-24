"use client";

import { useTranslations } from "next-intl";
import { logoutAction } from "./actions";
import { LogoutIcon } from "./NavIcons";

type Variant = "header" | "sidebar" | "sheet";

const CLASSES: Record<Variant, string> = {
  header: "btn-outline px-3 py-1.5",
  // Icon-only button on the dark green sidebar.
  sidebar:
    "flex h-11 w-11 items-center justify-center rounded-[0.625rem] border border-brand-cream/25 text-brand-cream transition hover:bg-brand-cream/10",
  // Full-width button in the phone "More" sheet.
  sheet:
    "min-h-12 w-full rounded-xl border border-brand-sand bg-white px-4 text-sm font-semibold text-red-800 transition hover:border-red-800",
};

export function LogoutButton({ variant = "header", className = "" }: { variant?: Variant; className?: string }) {
  const t = useTranslations("Dashboard");

  return (
    <form action={logoutAction} className={className}>
      <button
        type="submit"
        aria-label={variant === "sidebar" ? t("logout") : undefined}
        title={variant === "sidebar" ? t("logout") : undefined}
        className={CLASSES[variant]}
      >
        {variant === "sidebar" ? <LogoutIcon className="h-[18px] w-[18px]" /> : t("logout")}
      </button>
    </form>
  );
}
