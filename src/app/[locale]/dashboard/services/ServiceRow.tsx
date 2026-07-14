"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toggleServiceActiveAction, type ToggleServiceState } from "./actions";

const initialState: ToggleServiceState = {};

export function ServiceRow({
  service,
}: {
  service: { id: string; name: string; durationMinutes: number; priceAmd: number; isActive: boolean };
}) {
  const t = useTranslations("Services");
  const tErrors = useTranslations("Dashboard.errors");
  const [state, formAction, isPending] = useActionState(toggleServiceActiveAction, initialState);
  const isActive = state.isActive ?? service.isActive;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="font-medium text-brand-charcoal">{service.name}</p>
        <p className="text-sm text-brand-charcoal/60">
          {t("durationValue", { minutes: service.durationMinutes })} · {t("priceValue", { price: service.priceAmd })}
        </p>
        {state.formError && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.formError)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium ${isActive ? "text-brand-green" : "text-brand-charcoal/40"}`}>
          {isActive ? t("active") : t("inactive")}
        </span>
        <Link
          href={`/dashboard/services/${service.id}/edit`}
          className="text-sm font-medium text-brand-green underline"
        >
          {t("edit")}
        </Link>
        <form action={formAction}>
          <input type="hidden" name="serviceId" value={service.id} />
          <input type="hidden" name="isActive" value={String(isActive)} />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md border border-brand-charcoal/20 px-3 py-1.5 text-sm font-medium text-brand-charcoal transition hover:border-brand-charcoal/40 disabled:opacity-60"
          >
            {isActive ? t("deactivate") : t("activate")}
          </button>
        </form>
      </div>
    </div>
  );
}
