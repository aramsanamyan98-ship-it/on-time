import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import type { AuthResult } from "@/lib/auth/errors";

export async function verifyEmailToken(rawToken: string): Promise<AuthResult<{ specialistId: string }>> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  if (!token || token.consumedAt || token.expiresAt < new Date()) {
    return { ok: false, formError: "invalidOrExpiredToken" };
  }

  await prisma.$transaction([
    prisma.specialist.update({
      where: { id: token.specialistId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  return { ok: true, data: { specialistId: token.specialistId } };
}
