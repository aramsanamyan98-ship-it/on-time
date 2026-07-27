"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { dismissSubscriptionPromptAction } from "./plan/actions";

// 04_User_Flows.md Flow 5 step 5 / 08_Roadmap.md Phase 7: informational,
// non-blocking nudge shown once a specialist has received 5 bookings —
// never a modal/paywall, just a dismissible banner. Hides itself
// optimistically on dismiss; the server call persists that in the
// background so it doesn't reappear on the next page load.
export function SubscriptionPromptBanner({ initiallyVisible }: { initiallyVisible: boolean }) {
  const t = useTranslations("Subscription");
  const [visible, setVisible] = useState(initiallyVisible);
  const [, startTransition] = useTransition();

  if (!visible) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-gold/40 bg-brand-gold/10 px-6 py-3 text-sm text-brand-charcoal"
    >
      <p>{t("promptBannerText")}</p>
      <div className="flex items-center gap-4">
        <Link href="/dashboard/plan" className="font-medium text-brand-green underline">
          {t("promptBannerCta")}
        </Link>
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            startTransition(() => {
              void dismissSubscriptionPromptAction();
            });
          }}
          aria-label={t("promptBannerDismiss")}
          className="text-brand-charcoal/60 hover:text-brand-charcoal"
        >
          ×
        </button>
      </div>
    </div>
  );
}
