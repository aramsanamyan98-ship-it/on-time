import { prisma } from "@/lib/prisma";
import { generateRawToken, hashToken, PASSWORD_RESET_TOKEN_TTL_MS } from "@/lib/tokens";
import { sendEmail } from "@/lib/mailer";
import { buildPasswordResetEmail } from "@/lib/email-templates";
import { normalizeEmail } from "@/lib/auth/validation";
import type { AppLocale } from "@/i18n/routing";

/**
 * Always resolves without indicating whether the email exists, so this
 * can't be used to enumerate registered accounts.
 */
export async function requestPasswordReset(rawEmail: string, locale: AppLocale): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const specialist = await prisma.specialist.findUnique({ where: { email } });
  if (!specialist) return;

  const rawToken = generateRawToken();
  await prisma.passwordResetToken.create({
    data: {
      specialistId: specialist.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  });

  const link = `${process.env.APP_URL}/${locale}/reset-password?token=${rawToken}`;
  const content = buildPasswordResetEmail(locale, link);
  await sendEmail({ to: specialist.email, subject: content.subject, html: content.html, text: content.text });
}
