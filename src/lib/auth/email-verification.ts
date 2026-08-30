// Toggle for requiring email verification before an account can log in.
// Set SKIP_EMAIL_VERIFICATION=true (e.g. in Vercel production env vars)
// while no real email service is configured, so new accounts are usable
// immediately. Unset it (or set to anything else) to re-enable the normal
// verify-before-login flow — no code change needed.
export function emailVerificationRequired(): boolean {
  return process.env.SKIP_EMAIL_VERIFICATION !== "true";
}
