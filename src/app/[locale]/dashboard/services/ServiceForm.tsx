"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ServiceFormState } from "./actions";

const initialState: ServiceFormState = {};

export function ServiceForm({
  action,
  serviceId,
  initialValues,
}: {
  action: (prevState: ServiceFormState, formData: FormData) => Promise<ServiceFormState>;
  serviceId?: string;
  initialValues?: { name: string; durationMinutes: string; priceAmd: string; description: string };
}) {
  const t = useTranslations("Services");
  const tErrors = useTranslations("Dashboard.errors");
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {serviceId && <input type="hidden" name="serviceId" value={serviceId} />}

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-brand-charcoal">
          {t("nameLabel")}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={initialValues?.name}
          required
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
        {state.fieldErrors?.name && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.name)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="durationMinutes" className="text-sm font-medium text-brand-charcoal">
          {t("durationLabel")}
        </label>
        <input
          id="durationMinutes"
          name="durationMinutes"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          defaultValue={initialValues?.durationMinutes}
          required
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
        {state.fieldErrors?.durationMinutes && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.durationMinutes)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="priceAmd" className="text-sm font-medium text-brand-charcoal">
          {t("priceLabel")}
        </label>
        <input
          id="priceAmd"
          name="priceAmd"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          defaultValue={initialValues?.priceAmd}
          required
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
        {state.fieldErrors?.priceAmd && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.priceAmd)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-brand-charcoal">
          {t("descriptionLabel")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={initialValues?.description}
          className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
        {state.fieldErrors?.description && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.fieldErrors.description)}
          </p>
        )}
      </div>

      {state.formError && (
        <p role="alert" className="text-sm text-red-700">
          {tErrors(state.formError)}
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
