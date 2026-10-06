"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { reengageClientAction, type ReengageActionState } from "./actions";

const initialState: ReengageActionState = {};

export function ReengageButton({ guestPhone }: { guestPhone: string }) {
  const t = useTranslations("Clients");
  const [state, formAction, isPending] = useActionState(reengageClientAction, initialState);

  if (state.sentFor === guestPhone) {
    return <p className="text-sm font-medium text-brand-green">{t("reengageSent")}</p>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="guestPhone" value={guestPhone} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-brand-charcoal/20 px-3 py-1.5 text-sm font-medium text-brand-green transition hover:border-brand-green disabled:opacity-40"
      >
        {isPending ? t("reengageSending") : t("reengageButton")}
      </button>
    </form>
  );
}
