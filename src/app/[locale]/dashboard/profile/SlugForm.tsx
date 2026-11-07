"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateSlugAction, type ProfileState } from "./actions";

const initialState: ProfileState = {};

export function SlugForm({ slug, baseUrl }: { slug: string; baseUrl: string }) {
  const t = useTranslations("Profile");
  const tErrors = useTranslations("Dashboard.errors");
  const [state, formAction, isPending] = useActionState(updateSlugAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate>
      <label htmlFor="slug" className="text-sm font-medium text-brand-charcoal">
        {t("slugLabel")}
      </label>
      <div className="flex items-stretch gap-1 overflow-x-auto rounded-md border border-brand-charcoal/20 focus-within:border-brand-gold">
        <span className="whitespace-nowrap py-2 pl-3 text-sm text-brand-charcoal/60">{baseUrl}/</span>
        <input
          id="slug"
          name="slug"
          type="text"
          maxLength={40}
          defaultValue={slug}
          aria-describedby="slugWarning"
          className="min-w-0 flex-1 bg-transparent py-2 pr-3 text-sm text-brand-charcoal outline-none"
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
      <button type="submit" disabled={isPending} className="btn-outline mt-1 w-fit">
        {isPending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
