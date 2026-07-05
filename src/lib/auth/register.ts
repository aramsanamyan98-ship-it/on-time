import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { generateRawToken, hashToken, EMAIL_VERIFICATION_TOKEN_TTL_MS } from "@/lib/tokens";
import { generateUniqueSlug } from "@/lib/slug";
import { sendEmail } from "@/lib/mailer";
import { buildVerificationEmail } from "@/lib/email-templates";
import { normalizeEmail, validateRegistration } from "@/lib/auth/validation";
import { routingLocaleToLanguage } from "@/lib/locale";
import type { AppLocale } from "@/i18n/routing";
import type { AuthResult } from "@/lib/auth/errors";

const TRIAL_LENGTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, see 07_Business_Rules.md

function displayNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "specialist";
  return localPart.replace(/[._+-]+/g, " ").trim() || "Specialist";
}

async function issueVerificationEmail(
  specialistId: string,
  email: string,
  locale: AppLocale,
): Promise<void> {
  const rawToken = generateRawToken();
  await prisma.emailVerificationToken.create({
    data: {
      specialistId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS),
    },
  });

  const link = `${process.env.APP_URL}/api/auth/verify-email?token=${rawToken}`;
  const content = buildVerificationEmail(locale, link);
  await sendEmail({ to: email, subject: content.subject, html: content.html, text: content.text });
}

export async function registerSpecialist(
  rawEmail: string,
  password: string,
  confirmPassword: string,
  locale: AppLocale,
): Promise<AuthResult<{ email: string }>> {
  const fieldErrors = validateRegistration(rawEmail, password, confirmPassword);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const email = normalizeEmail(rawEmail);

  const existing = await prisma.specialist.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { ok: false, fieldErrors: { email: "emailTaken" } };
  }

  const passwordHash = await hashPassword(password);
  const displayName = displayNameFromEmail(email);
  const slug = await generateUniqueSlug(displayName);

  const specialist = await prisma.specialist.create({
    data: {
      email,
      passwordHash,
      displayName,
      slug,
      languagePreference: routingLocaleToLanguage[locale],
      trialEndsAt: new Date(Date.now() + TRIAL_LENGTH_MS),
    },
  });

  await issueVerificationEmail(specialist.id, specialist.email, locale);

  return { ok: true, data: { email: specialist.email } };
}

export async function resendVerificationEmail(rawEmail: string, locale: AppLocale): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const specialist = await prisma.specialist.findUnique({ where: { email } });

  // Always resolves the same way regardless of whether the account exists
  // or is already verified, so this endpoint can't be used to enumerate
  // registered emails.
  if (!specialist || specialist.emailVerifiedAt) return;

  await issueVerificationEmail(specialist.id, specialist.email, locale);
}
