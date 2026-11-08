"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { hostFromBaseUrl } from "@/lib/booking/urls";
import { updateSlugAction, type ProfileState } from "./actions";

const initialState: ProfileState = {};

/**
 * Booking-link editor: a fixed, muted "book.on-time.am/" prefix followed by
 * the editable slug in bold, with Copy link and Share for the saved link.
 */
export function SlugForm({
  slug,
  baseUrl,
  shareTitle,
}: {
  slug: string;
  /** Full base URL, e.g. https://book.on-time.am (no trailing slash). */
  baseUrl: string;
  shareTitle: string;
}) {
  const t = useTranslations("Profile");
  const tErrors = useTranslations("Dashboard.errors");
  const [state, formAction, isPending] = useActionState(updateSlugAction, initialState);
  const [copied, setCopied] = useState(false);
  const link = `${baseUrl}/${slug}`;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure context / permissions) — nothing to recover.
    }
  }

  async function shareLink() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shareTitle, url: link });
      } catch {
        // Share sheet dismissed — nothing to recover.
      }
      return;
    }
    await copyLink();
  }

  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate>
      <label htmlFor="slug" className="text-sm font-medium text-brand-charcoal">
        {t("slugLabel")}
      </label>
      <div className="flex items-stretch overflow-x-auto rounded-md border border-brand-charcoal/20 focus-within:border-brand-gold">
        <span id="slugPrefix" className="select-none whitespace-nowrap py-2 pl-3 text-sm text-brand-charcoal/50">
          {hostFromBaseUrl(baseUrl)}/
        </span>
        <input
          // Re-created after a save so the field shows the normalized slug.
          key={slug}
          id="slug"
          name="slug"
          type="text"
          maxLength={40}
          defaultValue={slug}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby="slugPrefix slugWarning"
          className="min-w-0 flex-1 bg-transparent py-2 pr-3 text-sm font-bold text-brand-charcoal outline-none"
        />
      </div>
      <p id="slugWarning" className="body-text text-sm text-amber-700">
        {t("slugWarning")}
      </p>
      {state.fieldErrors?.slug && (
        <p role="alert" className="text-sm text-red-700">
          {tErrors(state.fieldErrors.slug)}
        </p>
      )}
      {state.formError && (
        <p role="alert" className="text-sm text-red-700">
          {tErrors(state.formError)}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-brand-green">
          {t("saved")}
        </p>
      )}
      <div className="mt-1 flex flex-wrap gap-2">
        <button type="submit" disabled={isPending} className="btn-primary w-fit">
          {isPending ? t("saving") : t("save")}
        </button>
        <button type="button" onClick={copyLink} className="btn-outline w-fit">
          {copied ? t("copied") : t("copyLink")}
        </button>
        <button type="button" onClick={shareLink} className="btn-outline w-fit">
          {t("shareLink")}
        </button>
      </div>
    </form>
  );
}
