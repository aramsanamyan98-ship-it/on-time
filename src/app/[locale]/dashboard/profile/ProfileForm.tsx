"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateProfileAction, type ProfileState } from "./actions";

const initialState: ProfileState = {};

export function ProfileForm({
  bio,
  phone,
  address,
  instagramUrl,
}: {
  bio: string;
  phone: string;
  address: string;
  instagramUrl: string;
}) {
  const t = useTranslations("Profile");
  const tErrors = useTranslations("Dashboard.errors");
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="bio" className="text-sm font-medium text-brand-charcoal">
          {t("bioLabel")}
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={500}
          defaultValue={bio}
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
        {state.fieldErrors?.bio && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.bio)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm font-medium text-brand-charcoal">
          {t("phoneLabel")}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone}
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
        {state.fieldErrors?.phone && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.phone)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="address" className="text-sm font-medium text-brand-charcoal">
          {t("addressLabel")}
        </label>
        <input
          id="address"
          name="address"
          type="text"
          defaultValue={address}
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
        {state.fieldErrors?.address && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.address)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="instagram" className="text-sm font-medium text-brand-charcoal">
          {t("instagramLabel")}
        </label>
        <input
          id="instagram"
          name="instagram"
          type="text"
          placeholder="@yourhandle"
          defaultValue={instagramUrl}
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
        {state.fieldErrors?.instagramUrl && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.instagramUrl)}
          </p>
        )}
      </div>

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

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 w-fit rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
