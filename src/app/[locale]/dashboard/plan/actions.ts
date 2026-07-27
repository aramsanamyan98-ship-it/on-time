"use server";

import { getLocale } from "next-intl/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { inviteReferralByEmail } from "@/lib/subscription/referrals";
import type { AppLocale } from "@/i18n/routing";
import type { FieldErrors, DashboardErrorCode } from "@/lib/dashboard/errors";

export type InviteReferralState = {
  fieldErrors?: FieldErrors;
  formError?: DashboardErrorCode;
  success?: boolean;
};

export async function inviteReferralAction(
  _prevState: InviteReferralState,
  formData: FormData,
): Promise<InviteReferralState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };
  const locale = (await getLocale()) as AppLocale;

  const specialist = await prisma.specialist.findUnique({ where: { id: session.specialistId } });
  if (!specialist || specialist.deletedAt) return { formError: "generic" };

  const email = String(formData.get("email") ?? "");
  const referralLink = `${process.env.APP_URL}/${locale}/book/${specialist.slug}?ref=${specialist.referralCode}`;

  const result = await inviteReferralByEmail(specialist.id, email, referralLink, specialist.displayName, locale);
  if (!result.ok) return { fieldErrors: result.fieldErrors, formError: result.formError };

  return { success: true };
}

/**
 * Called directly from a client component (no <form>/useActionState) —
 * the banner hides itself optimistically and just needs this to persist
 * the dismissal in the background, so a plain fire-and-forget call is
 * simpler here than the useActionState ceremony every other form uses.
 */
export async function dismissSubscriptionPromptAction(): Promise<void> {
  const session = await getSession();
  if (!session) return;

  await prisma.specialist.update({
    where: { id: session.specialistId },
    data: { subscriptionPromptDismissedAt: new Date() },
  });
}
