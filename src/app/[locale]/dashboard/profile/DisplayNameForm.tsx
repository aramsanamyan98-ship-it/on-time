"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateDisplayNameAction, type ProfileState } from "./actions";

const initialState: ProfileState = {};

export function DisplayNameForm({ displayName }: { displayName: string }) {
  const t = useTranslations("Profile");
  const tErrors = useTranslations("Dashboard.errors");
  const [state, formAction, isPending] = useActionState(updateDisplayNameAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate>
      <label htmlFor="displayName" className="text-sm font-medium text-brand-charcoal">
        {t("displayNameLabel")}
      </label>
      <input
        id="displayName"
        name="displayName"
        type="text"
        maxLength={60}
        autoComplete="name"
        defaultValue={displayName}
        aria-describedby="displayNameHint"
        className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
      />
      <p id="displayNameHint" className="body-text text-sm">
        {t("displayNameHint")}
      </p>
      {state.fieldErrors?.displayName && (
        <p role="alert" className="text-sm text-red-700">
          {tErrors(state.fieldErrors.displayName)}
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
      <button type="submit" disabled={isPending} className="btn-primary mt-2 w-fit">
        {isPending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
