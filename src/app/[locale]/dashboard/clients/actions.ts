"use server";

import { getSession } from "@/lib/session";

export type ReengageActionState = { sentFor?: string };

/**
 * Stub: WhatsApp/messaging isn't built yet (docs/08_Roadmap.md), so this
 * just records intent server-side and lets the UI show a "would send a
 * reminder" state — no persistence, nothing to build toward until the real
 * channel exists.
 */
export async function reengageClientAction(
  _prevState: ReengageActionState,
  formData: FormData,
): Promise<ReengageActionState> {
  const session = await getSession();
  if (!session) return {};

  const guestPhone = String(formData.get("guestPhone") ?? "");
  if (!guestPhone) return {};

  console.log(`[reengage] specialist ${session.specialistId} would send a reminder to ${guestPhone}`);

  return { sentFor: guestPhone };
}
