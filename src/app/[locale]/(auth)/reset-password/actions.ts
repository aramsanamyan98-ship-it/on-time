"use server";

import { resetPassword } from "@/lib/auth/reset-password";
import type { FieldErrors, AuthErrorCode } from "@/lib/auth/errors";

export type ResetPasswordState = {
  fieldErrors?: FieldErrors;
  formError?: AuthErrorCode;
  success?: boolean;
};

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const result = await resetPassword(token, password, confirmPassword);
  if (!result.ok) {
    return { fieldErrors: result.fieldErrors, formError: result.formError };
  }

  return { success: true };
}
