"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { saveClientNoteAction, type ClientNoteActionState } from "./actions";

const initialState: ClientNoteActionState = {};

export function ClientNoteForm({
  guestPhone,
  initialNotes,
  justSaved,
}: {
  guestPhone: string;
  initialNotes: string;
  justSaved: boolean;
}) {
  const t = useTranslations("Clients");
  const [state, formAction, isPending] = useActionState(saveClientNoteAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="guestPhone" value={guestPhone} />
      <label htmlFor="notes" className="text-sm font-medium text-brand-charcoal">
        {t("notesLabel")}
      </label>
      <textarea
        id="notes"
        name="notes"
        rows={4}
        maxLength={2000}
        defaultValue={initialNotes}
        placeholder={t("notesPlaceholder")}
        className="rounded-md border border-brand-charcoal/20 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {t(`errors.${state.error}`)}
        </p>
      )}
      {!state.error && justSaved && <p className="text-sm text-brand-green">{t("notesSaved")}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? t("savingNotes") : t("saveNotes")}
      </button>
    </form>
  );
}
