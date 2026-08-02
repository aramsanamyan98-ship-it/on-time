"use client";

import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { uploadProfilePhotoAction, uploadCoverPhotoAction, type PhotoState } from "./actions";

const initialState: PhotoState = {};

export function PhotoUploadForm({
  kind,
  initialUrl,
}: {
  kind: "profile" | "cover";
  initialUrl: string | null;
}) {
  const t = useTranslations("Profile");
  const tErrors = useTranslations("Dashboard.errors");
  const action = kind === "profile" ? uploadProfilePhotoAction : uploadCoverPhotoAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const src = state.url ?? initialUrl;
  const isProfile = kind === "profile";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-brand-charcoal">
        {isProfile ? t("photoLabel") : t("coverLabel")}
      </span>
      <div
        className={
          isProfile
            ? "h-28 w-28 overflow-hidden rounded-full border border-brand-charcoal/10 bg-brand-warm-white shadow-sm"
            : "h-32 w-full max-w-md overflow-hidden rounded-lg border border-brand-charcoal/10 bg-brand-warm-white shadow-sm"
        }
      >
        {src ? (
          <Image
            src={src}
            alt=""
            width={isProfile ? 112 : 800}
            height={isProfile ? 112 : 128}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-brand-charcoal/40">
            {t("noPhoto")}
          </div>
        )}
      </div>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          required
          className="sr-only"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
        <button
          type="button"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
          className="btn-outline px-3 py-1.5"
        >
          {isPending ? t("uploading") : t("upload")}
        </button>
      </form>
      {state.formError && (
        <p role="alert" className="text-sm text-red-700">
          {tErrors(state.formError)}
        </p>
      )}
    </div>
  );
}
