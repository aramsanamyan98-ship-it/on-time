"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { uploadPortfolioPhotoAction, type PortfolioActionState } from "./actions";

const initialState: PortfolioActionState = {};

export function PortfolioUploadForm() {
  const t = useTranslations("Portfolio");
  const tErrors = useTranslations("Dashboard.errors");
  const [state, formAction, isPending] = useActionState(uploadPortfolioPhotoAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        type="file"
        name="photo"
        accept="image/jpeg,image/png,image/webp"
        required
        className="text-sm text-brand-charcoal/70"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-brand-charcoal/20 px-3 py-1.5 text-sm font-medium text-brand-charcoal transition hover:border-brand-charcoal/40 disabled:opacity-60"
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
