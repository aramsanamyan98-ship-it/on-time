"use server";

import { getLocale } from "next-intl/server";
import { getSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import type { AppLocale } from "@/i18n/routing";

const NOTES_MAX_LENGTH = 2000;

export type ClientNoteActionState = {
  error?: "notesTooLong" | "notFound" | "generic";
};

// Notes are keyed by (specialist, guest phone) — see prisma/schema.prisma
// `ClientNote` and 02_PRD.md Section 10. Only lets a specialist attach a
// note to a phone number that has actually appeared on one of their own
// appointments, so this can't be used to create arbitrary orphan records.
export async function saveClientNoteAction(
  _prevState: ClientNoteActionState,
  formData: FormData,
): Promise<ClientNoteActionState> {
  const session = await getSession();
  if (!session) return { error: "generic" };
  const locale = (await getLocale()) as AppLocale;

  const guestPhone = String(formData.get("guestPhone") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!guestPhone) return { error: "notFound" };
  if (notes.length > NOTES_MAX_LENGTH) return { error: "notesTooLong" };

  const hasAppointment = await prisma.appointment.findFirst({
    where: { specialistId: session.specialistId, guestPhone },
    select: { id: true },
  });
  if (!hasAppointment) return { error: "notFound" };

  await prisma.clientNote.upsert({
    where: { specialistId_guestPhone: { specialistId: session.specialistId, guestPhone } },
    create: { specialistId: session.specialistId, guestPhone, notes: notes || null },
    update: { notes: notes || null },
  });

  return redirect({ href: `/dashboard/clients/${encodeURIComponent(guestPhone)}?saved=1`, locale });
}
