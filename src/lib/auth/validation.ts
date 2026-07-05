import type { FieldErrors } from "@/lib/auth/errors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): FieldErrors {
  const trimmed = email.trim();
  if (!trimmed) return { email: "emailRequired" };
  if (!EMAIL_RE.test(trimmed)) return { email: "emailInvalid" };
  return {};
}

export function validatePassword(password: string): FieldErrors {
  if (!password) return { password: "passwordRequired" };
  if (password.length < MIN_PASSWORD_LENGTH) return { password: "passwordTooShort" };
  return {};
}

export function validateRegistration(email: string, password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = { ...validateEmail(email), ...validatePassword(password) };
  if (!errors.password && password !== confirmPassword) {
    errors.confirmPassword = "passwordsDoNotMatch";
  }
  return errors;
}

export function validateNewPassword(password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = { ...validatePassword(password) };
  if (!errors.password && password !== confirmPassword) {
    errors.confirmPassword = "passwordsDoNotMatch";
  }
  return errors;
}
