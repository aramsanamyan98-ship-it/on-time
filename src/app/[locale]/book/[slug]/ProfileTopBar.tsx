"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ShareIcon } from "./ProfileIcons";

const SHORT_LABELS = { hy: "ՀԱՅ", ru: "РУС", en: "ENG" } as const;

export function ProfileTopBar({ shareTitle, showShare = true }: { shareTitle: string; showShare?: boolean }) {
  const t = useTranslations("PublicProfile");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Share sheet dismissed or clipboard blocked — nothing to recover.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Real On-Time mark (light version, made for dark backgrounds) + name, linking to the marketing site. */}
      <a
        href="https://on-time.am"
        aria-label={tCommon("logoLinkLabel")}
        className="flex min-h-11 items-center gap-2 font-bold tracking-tight text-brand-cream"
      >
        <Image src="/brand/on-time-icon-light.png" alt="" width={28} height={28} className="h-7 w-7 shrink-0" />
        <span>{tCommon("appName")}</span>
      </a>

      <div className="flex items-center gap-2">
        <div role="group" aria-label={t("languageAria")} className="flex items-center rounded-full border border-brand-cream/30 p-0.5">
          {routing.locales.map((code) => (
            <button
              key={code}
              type="button"
              lang={code}
              aria-label={tCommon(`localeNames.${code}`)}
              aria-pressed={locale === code}
              onClick={() => router.replace(pathname, { locale: code })}
              className={`min-h-11 min-w-11 rounded-full px-2 text-xs font-semibold transition ${
                locale === code ? "bg-brand-cream text-brand-green" : "text-brand-cream hover:bg-brand-cream/10"
              }`}
            >
              {SHORT_LABELS[code]}
            </button>
          ))}
        </div>
        {showShare && (
        <button
          type="button"
          onClick={share}
          aria-label={copied ? t("shareCopied") : t("share")}
          title={copied ? t("shareCopied") : t("share")}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-cream/30 text-brand-cream transition hover:bg-brand-cream/10"
        >
          <ShareIcon className="h-4 w-4" />
        </button>
        )}
        <span role="status" className="sr-only">
          {copied ? t("shareCopied") : ""}
        </span>
      </div>
    </div>
  );
}
