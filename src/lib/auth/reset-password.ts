import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { hashPassword } from "@/lib/password";
import { validateNewPassword } from "@/lib/auth/validation";
import type { AuthResult } from "@/lib/auth/errors";

export async function resetPassword(
  rawToken: string,
  password: string,
  confirmPassword: string,
): Promise<AuthResult<null>> {
  const fieldErrors = validateNewPassword(password, confirmPassword);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const tokenHash = hashToken(rawToken);
  const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!token || token.consumedAt || token.expiresAt < new Date()) {
    return { ok: false, formError: "invalid_or_expired_token" };
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.specialist.update({
      where: { id: token.specialistId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  return { ok: true, data: null };
}

export async function checkResetToken(rawToken: string): Promise<boolean> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  return Boolean(token && !token.consumedAt && token.expiresAt >= new Date());
}
