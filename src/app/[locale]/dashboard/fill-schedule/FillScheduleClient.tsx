"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buildSlotBookingUrl } from "@/lib/booking/slot-link";
import type { AppLocale } from "@/i18n/routing";

type ServiceOption = {
  id: string;
  name: string;
  /** ISO instants, soonest first — index 0 is the suggested slot. */
  slots: string[];
};

// Each language's own name, deliberately not translated: you recognise your
// language by how it's written.
const LANGUAGES: { code: AppLocale; label: string }[] = [
  { code: "hy", label: "Հայերեն" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
];

type Preview =
  | { key: string; status: "ready"; file: File; url: string }
  | { key: string; status: "slotGone" | "error" };

type Notice = { text: string; isError: boolean };

export function FillScheduleClient({
  services,
  timezone,
  slug,
  baseUrl,
  defaultLanguage,
}: {
  services: ServiceOption[];
  timezone: string;
  slug: string;
  baseUrl: string;
  defaultLanguage: AppLocale;
}) {
  const t = useTranslations("FillSchedule");
  const uiLocale = useLocale();

  const [serviceId, setServiceId] = useState(services[0].id);
  const [slotIso, setSlotIso] = useState(services[0].slots[0]);
  const [language, setLanguage] = useState<AppLocale>(defaultLanguage);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [copied, setCopied] = useState(false);

  const service = services.find((s) => s.id === serviceId) ?? services[0];
  const link = buildSlotBookingUrl({
    baseUrl,
    locale: language,
    slug,
    serviceId: service.id,
    startAt: new Date(slotIso),
  });

  // The image is fetched up front (not on click) so the main button already
  // holds the File: navigator.share must start from the tap itself, and
  // awaiting a network request first can make mobile browsers refuse it.
  // Tagged with its inputs so "loading" is derived (no result for the
  // current selection yet) rather than set synchronously inside the effect.
  const previewKey = `${serviceId}|${slotIso}|${language}`;
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;

    const query = new URLSearchParams({ serviceId, start: slotIso, lang: language });
    fetch(`/api/story-image?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 409) return setPreview({ key: previewKey, status: "slotGone" });
        if (!response.ok) return setPreview({ key: previewKey, status: "error" });
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setPreview({
          key: previewKey,
          status: "ready",
          file: new File([blob], "on-time-story.png", { type: "image/png" }),
          url: objectUrl,
        });
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setPreview({ key: previewKey, status: "error" });
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewKey, serviceId, slotIso, language]);

  const current = preview && preview.key === previewKey ? preview : null;
  const readyPreview = current?.status === "ready" ? current : null;

  // Only evaluated once a preview exists, i.e. after the client-side fetch — never during SSR.
  const canShareFiles =
    !!readyPreview &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [readyPreview.file] });

  const slotFormatter = new Intl.DateTimeFormat(uiLocale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });

  function selectService(id: string) {
    const next = services.find((s) => s.id === id);
    if (!next) return;
    setServiceId(id);
    // Keep the chosen time if this service can also start then, else jump to its soonest slot.
    setSlotIso(next.slots.includes(slotIso) ? slotIso : next.slots[0]);
    setNotice(null);
  }

  function copyLinkManually() {
    navigator.clipboard
      ?.writeText(link)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  // Clipboard and share are both started synchronously inside the click,
  // before any await, so they stay within the tap's user activation.
  function handleMainAction() {
    if (!readyPreview) return;
    const { file, url } = readyPreview;

    const linkCopied: Promise<boolean> = navigator.clipboard
      ? navigator.clipboard.writeText(link).then(
          () => true,
          () => false,
        )
      : Promise.resolve(false);
    const report = (successText: string) =>
      linkCopied.then((ok) => setNotice(ok ? { text: successText, isError: false } : { text: t("linkCopyFailed"), isError: true }));

    if (canShareFiles) {
      navigator.share({ files: [file] }).then(
        () => report(t("shared")),
        (error) => {
          // Dismissing the share sheet isn't an error.
          if (error?.name !== "AbortError") setNotice({ text: t("previewError"), isError: true });
        },
      );
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    report(t("downloaded"));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="panel flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="story-service" className="text-sm font-medium text-brand-charcoal">
            {t("serviceLabel")}
          </label>
          <select
            id="story-service"
            value={serviceId}
            onChange={(event) => selectService(event.target.value)}
            className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-brand-charcoal">{t("slotLabel")}</legend>
          <div className="flex flex-wrap gap-2">
            {service.slots.map((iso, index) => (
              <button
                key={iso}
                type="button"
                aria-pressed={slotIso === iso}
                onClick={() => {
                  setSlotIso(iso);
                  setNotice(null);
                }}
                className={`rounded-md border px-3 py-2 text-sm transition ${
                  slotIso === iso
                    ? "border-brand-gold bg-brand-gold/20 font-semibold text-brand-charcoal"
                    : "border-brand-charcoal/20 text-brand-charcoal hover:border-brand-charcoal/40"
                }`}
              >
                {slotFormatter.format(new Date(iso))}
                {index === 0 && <span className="ml-2 text-xs font-medium text-brand-green">{t("suggestedBadge")}</span>}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-brand-charcoal">{t("languageLabel")}</legend>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                lang={l.code}
                aria-pressed={language === l.code}
                onClick={() => {
                  setLanguage(l.code);
                  setNotice(null);
                }}
                className={`rounded-md border px-3 py-2 text-sm transition ${
                  language === l.code
                    ? "border-brand-gold bg-brand-gold/20 font-semibold text-brand-charcoal"
                    : "border-brand-charcoal/20 text-brand-charcoal hover:border-brand-charcoal/40"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="panel flex flex-col items-center gap-4">
        <h2 className="heading-section self-start">{t("previewHeading")}</h2>
        <div className="flex aspect-[9/16] w-full max-w-[270px] items-center justify-center overflow-hidden rounded-xl bg-brand-charcoal">
          {readyPreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob: URL of the generated PNG, not an optimizable remote image
            <img src={readyPreview.url} alt={t("previewAlt")} className="h-full w-full object-cover" />
          ) : (
            <p className="px-4 text-center text-sm text-warm-white/80" role="status">
              {!current ? t("previewLoading") : current.status === "slotGone" ? t("previewSlotGone") : t("previewError")}
            </p>
          )}
        </div>

        <button type="button" onClick={handleMainAction} disabled={!readyPreview} className="btn-accent w-full max-w-[270px]">
          {!readyPreview ? t("working") : canShareFiles ? t("shareButton") : t("downloadButton")}
        </button>

        {notice && (
          <p role="status" className={`text-center text-sm ${notice.isError ? "text-red-700" : "text-brand-green"}`}>
            {notice.text}
          </p>
        )}
      </div>

      <div className="panel flex flex-col gap-3">
        <h2 className="heading-section">{t("stepsHeading")}</h2>
        <ol className="body-text list-decimal space-y-1 pl-5 text-sm">
          <li>{t("step1")}</li>
          <li>{t("step2")}</li>
        </ol>
        <p className="text-sm text-brand-charcoal/60">{t("hint")}</p>

        <div className="flex flex-col gap-1 pt-2">
          <label htmlFor="story-link" className="text-sm font-medium text-brand-charcoal">
            {t("linkLabel")}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id="story-link"
              type="text"
              readOnly
              value={link}
              onFocus={(event) => event.currentTarget.select()}
              className="flex-1 rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm text-brand-charcoal"
            />
            <button type="button" onClick={copyLinkManually} className="btn-outline w-fit">
              {copied ? t("copied") : t("copyLink")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
