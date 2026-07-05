/**
 * Error/validation codes shared between server actions and the UI. Codes,
 * not messages, cross this boundary — the UI maps each code to a string
 * via next-intl's `Auth.errors` namespace, so nothing user-facing is ever
 * hardcoded in a single language (02_PRD.md Section 2).
 */
export type AuthErrorCode =
  | "emailRequired"
  | "emailInvalid"
  | "passwordRequired"
  | "passwordTooShort"
  | "passwordsDoNotMatch"
  | "emailTaken"
  | "invalidCredentials"
  | "emailNotVerified"
  | "invalidOrExpiredToken"
  | "generic";

export type FieldErrors = Partial<Record<"email" | "password" | "confirmPassword", AuthErrorCode>>;

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors?: FieldErrors; formError?: AuthErrorCode };
