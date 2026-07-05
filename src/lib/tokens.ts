import { randomBytes, createHash } from "crypto";

/**
 * Verification/reset links carry the raw token; only its hash is stored in
 * the database (05_Database.md requires booking_token-style tokens to be
 * unguessable — same principle applies here so a DB leak alone can't be
 * used to take over accounts).
 */
export function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
