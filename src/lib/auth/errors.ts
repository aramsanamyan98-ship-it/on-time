/**
 * Error/validation codes shared between server actions and the UI. Codes,
 * not messages, cross this boundary — the UI maps each code to a string
 * via next-intl's `Auth.errors` namespace, so nothing user-facing is ever
 * hardcoded in a single language (02_PRD.md Section 2).
 */
export type AuthErrorCode =
  | "email_required"
  | "email_invalid"
  | "password_required"
  | "password_too_short"
  | "passwords_do_not_match"
  | "email_taken"
  | "invalid_credentials"
  | "email_not_verified"
  | "invalid_or_expired_token"
  | "generic";

export type FieldErrors = Partial<Record<"email" | "password" | "confirmPassword", AuthErrorCode>>;

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors?: FieldErrors; formError?: AuthErrorCode };
