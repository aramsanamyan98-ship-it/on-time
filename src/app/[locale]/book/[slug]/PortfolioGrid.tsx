"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const COLLAPSED_COUNT = 6;

/**
 * Square photo grid. When there are more photos than fit, the last collapsed
 * tile becomes a "+N more" button that reveals the rest in place.
 */
export function PortfolioGrid({ photos, altText }: { photos: { id: string; url: string }[]; altText: string }) {
  const t = useTranslations("PublicProfile");
  const [expanded, setExpanded] = useState(false);

  const overflow = photos.length > COLLAPSED_COUNT;
  const visible = expanded || !overflow ? photos : photos.slice(0, COLLAPSED_COUNT - 1);

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:grid-cols-4">
        {visible.map((photo) => (
          <li key={photo.id} className="aspect-square overflow-hidden rounded-xl bg-brand-sand">
            {/* Plain <img>: portfolio URLs aren't guaranteed to be on a next/image-allowed host. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={altText} loading="lazy" className="h-full w-full object-cover" />
          </li>
        ))}
        {overflow && !expanded && (
          <li className="aspect-square">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={t("portfolioShowAll", { count: photos.length })}
              className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl bg-brand-green text-sm font-semibold text-brand-cream transition hover:bg-brand-green-hover"
            >
              <span className="text-xl font-bold text-brand-gold">+{photos.length - (COLLAPSED_COUNT - 1)}</span>
            </button>
          </li>
        )}
      </ul>
      {overflow && expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="min-h-11 self-center text-sm font-semibold text-brand-green hover:underline"
        >
          {t("portfolioShowLess")}
        </button>
      )}
    </div>
  );
}
