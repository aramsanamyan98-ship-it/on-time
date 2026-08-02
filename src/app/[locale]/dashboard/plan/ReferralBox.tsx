"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function ReferralBox({ link }: { link: string }) {
  const t = useTranslations("Subscription");
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="text"
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm text-brand-charcoal"
      />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="btn-outline w-fit"
      >
        {copied ? t("copied") : t("copyLink")}
      </button>
    </div>
  );
}
