"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { deleteBlockedTimeAction, type DeleteBlockedTimeState } from "./actions";

const initialState: DeleteBlockedTimeState = {};

export function BlockedTimeRow({
  blockedTime,
}: {
  blockedTime: { id: string; formattedRange: string; reason: string | null };
}) {
  const t = useTranslations("BlockedTime");
  const tErrors = useTranslations("Dashboard.errors");
  const [state, formAction, isPending] = useActionState(deleteBlockedTimeAction, initialState);

  return (
    <div className="surface-card flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-brand-charcoal">{blockedTime.formattedRange}</p>
        {blockedTime.reason && <p className="body-text text-sm">{blockedTime.reason}</p>}
        {state.formError && (
          <p role="alert" className="text-sm text-red-700">
            {tErrors(state.formError)}
          </p>
        )}
      </div>
      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm(t("confirmDelete"))) event.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={blockedTime.id} />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md border border-brand-charcoal/20 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:border-red-700 hover:bg-red-50 disabled:opacity-40"
        >
          {isPending ? t("deleting") : t("delete")}
        </button>
      </form>
    </div>
  );
}
