"use client";

import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";
import { uploadPortfolioPhotoAction, type PortfolioActionState } from "./actions";

const initialState: PortfolioActionState = {};

export function PortfolioUploadForm() {
  const t = useTranslations("Portfolio");
  const tErrors = useTranslations("Dashboard.errors");
  const [state, formAction, isPending] = useActionState(uploadPortfolioPhotoAction, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
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
        {isPending ? t("uploading") : t("addPhoto")}
      </button>
      {state.formError && (
        <p role="alert" className="w-full text-sm text-red-700">
          {tErrors(state.formError)}
        </p>
      )}
    </form>
  );
}
