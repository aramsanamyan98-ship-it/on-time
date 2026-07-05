import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import { normalizeEmail, validateEmail, validatePassword } from "@/lib/auth/validation";
import type { AuthResult, FieldErrors } from "@/lib/auth/errors";

// A hash of a password nobody will ever type, used to keep the bcrypt
// compare cost constant whether or not the email exists — otherwise a
// missing-account response returns faster than a wrong-password one,
// leaking which emails are registered.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7Uxr8h6b9lWXAr8HQxJfPmDzE9lJx9m";

export async function loginSpecialist(
  rawEmail: string,
  password: string,
): Promise<AuthResult<{ specialistId: string }>> {
  const fieldErrors: FieldErrors = { ...validateEmail(rawEmail), ...validatePassword(password) };
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const email = normalizeEmail(rawEmail);
  const specialist = await prisma.specialist.findUnique({ where: { email } });

  const passwordMatches = await verifyPassword(password, specialist?.passwordHash ?? DUMMY_HASH);
  if (!specialist || !passwordMatches) {
    return { ok: false, formError: "invalid_credentials" };
  }

  if (!specialist.emailVerifiedAt) {
    return { ok: false, formError: "email_not_verified" };
  }

  await setSessionCookie(specialist.id);
  return { ok: true, data: { specialistId: specialist.id } };
}
