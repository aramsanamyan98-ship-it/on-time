"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { submitCompressedFile } from "@/lib/uploads/compressImage";
import { uploadPortfolioPhotoAction, type PortfolioActionState } from "./actions";

const initialState: PortfolioActionState = {};

export function PortfolioUploadForm() {
  const t = useTranslations("Portfolio");
  const tErrors = useTranslations("Dashboard.errors");
  const [state, formAction, isPending] = useActionState(uploadPortfolioPhotoAction, initialState);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBusy = isPending || isCompressing;

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        name="photo"
        accept="image/jpeg,image/png,image/webp"
        required
        className="sr-only"
        onChange={(e) => submitCompressedFile(e.currentTarget, setIsCompressing)}
      />
      <button
        type="button"
        disabled={isBusy}
        onClick={() => fileInputRef.current?.click()}
        className="btn-outline px-3 py-1.5"
      >
        {isBusy ? t("uploading") : t("addPhoto")}
      </button>
      {state.formError && (
        <p role="alert" className="w-full text-sm text-red-700">
          {tErrors(state.formError)}
        </p>
      )}
    </form>
  );
}
