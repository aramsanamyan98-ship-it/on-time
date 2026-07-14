/**
 * Error/validation codes shared between the Phase 2 profile/services/
 * working-hours server actions and the UI, following the same
 * code-not-message convention as src/lib/auth/errors.ts: the UI maps each
 * code to a string via next-intl's `Dashboard.errors` namespace, so nothing
 * user-facing is ever hardcoded in a single language (02_PRD.md Section 2).
 */
export type DashboardErrorCode =
  | "bioTooLong"
  | "phoneInvalid"
  | "addressTooLong"
  | "instagramInvalid"
  | "fileRequired"
  | "fileTooLarge"
  | "fileTypeInvalid"
  | "nameRequired"
  | "nameTooLong"
  | "durationRequired"
  | "durationInvalid"
  | "priceRequired"
  | "priceInvalid"
  | "descriptionTooLong"
  | "timeRequired"
  | "timeInvalid"
  | "endBeforeStart"
  | "notFound"
  | "generic";

export type FieldErrors<K extends string = string> = Partial<Record<K, DashboardErrorCode>>;

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors?: FieldErrors; formError?: DashboardErrorCode };
