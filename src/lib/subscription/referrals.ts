import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";
import { buildReferralInviteEmail } from "@/lib/email-templates";
import { applyReferralExtensions } from "@/lib/subscription/trial";
import type { AppLocale } from "@/i18n/routing";
import type { Prisma, Referral } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/dashboard/errors";

function randomReferralCode(): string {
  return randomBytes(6).toString("hex").slice(0, 10).toUpperCase();
}

/** Short, unguessable-enough (not security-sensitive, unlike auth tokens) per-specialist invite code — see docs/05_Database.md `referrals`. */
export async function generateUniqueReferralCode(): Promise<string> {
  let candidate = randomReferralCode();
  while (await prisma.specialist.findUnique({ where: { referralCode: candidate }, select: { id: true } })) {
    candidate = randomReferralCode();
  }
  return candidate;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Specialist-initiated invite (04_User_Flows.md Flow 5 / 08_Roadmap.md
 * Phase 7 "a way to invite others"): records the invite as `invited` and
 * emails the referral link. The referral only becomes a successful one
 * (and counts toward trial extension) once that person's first appointment
 * is booked — see recordReferralBookingIfEligible below.
 */
export async function inviteReferralByEmail(
  specialistId: string,
  rawEmail: string,
  referralLink: string,
  specialistName: string,
  locale: AppLocale,
): Promise<ActionResult<Referral>> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return { ok: false, fieldErrors: { email: "emailRequired" } };
  if (!EMAIL_PATTERN.test(email)) return { ok: false, fieldErrors: { email: "emailInvalid" } };

  const referral = await prisma.referral.create({
    data: { specialistId, referredEmail: email, status: "invited" },
  });

  const content = buildReferralInviteEmail(locale, { link: referralLink, specialistName });
  await sendEmail({ to: email, subject: content.subject, html: content.html, text: content.text });

  return { ok: true, data: referral };
}

/**
 * Called after a guest booking is created (see create-booking.ts). Matches
 * the referral link's code to its owning specialist, confirms this is that
 * guest's first-ever booking with this specialist (guestPhone is this
 * app's stable client identity, scoped per specialist — see
 * src/lib/dashboard/clients.ts), then records/updates a `Referral` row and
 * re-evaluates the referral trial extension. Never throws: a bookkeeping
 * failure here must not affect the booking that already succeeded.
 */
export async function recordReferralBookingIfEligible(params: {
  referralCode: string | null;
  specialistId: string;
  guestPhone: string;
  guestEmail: string | null;
}): Promise<void> {
  const { referralCode, specialistId, guestPhone, guestEmail } = params;
  if (!referralCode) return;

  try {
    const referrer = await prisma.specialist.findUnique({ where: { referralCode }, select: { id: true } });
    // Only meaningful when the code belongs to the specialist actually
    // being booked — a guest can only be "referred into" the one
    // specialist's booking page they're on.
    if (!referrer || referrer.id !== specialistId) return;

    const bookingCount = await prisma.appointment.count({ where: { specialistId, guestPhone } });
    if (bookingCount !== 1) return; // the just-created appointment itself; anything more means this guest has booked before

    const emailMatch: Prisma.ReferralWhereInput[] = guestEmail ? [{ referredEmail: guestEmail }] : [];
    const existingInvite = await prisma.referral.findFirst({
      where: { specialistId, status: "invited", OR: [{ referredPhone: guestPhone }, ...emailMatch] },
    });

    if (existingInvite) {
      await prisma.referral.update({
        where: { id: existingInvite.id },
        data: { status: "booked_first_appointment", referredPhone: guestPhone },
      });
    } else {
      // No pre-existing invite (the specialist just shared the raw link) —
      // the booking itself is the first evidence of this referral.
      await prisma.referral.create({
        data: { specialistId, referredPhone: guestPhone, referredEmail: guestEmail, status: "booked_first_appointment" },
      });
    }

    await applyReferralExtensions(specialistId);
  } catch (err) {
    console.error("[referrals] failed to record referral booking:", err);
  }
}
