const COUNTRY_CODE = "+374";
const NATIONAL_LENGTH = 8;

export type NormalizedPhone = { phone: string };
export type NormalizePhoneError = { error: "phoneInvalid" };

/**
 * Canonicalizes any reasonable Armenian phone input to E.164 (+374XXXXXXXX).
 * Accepts +374/00374/374-prefixed international forms, the 0-prefixed local
 * form, and a bare 8-digit national number. Anything else (wrong length,
 * non-Armenian country code, garbage) is rejected rather than guessed at,
 * since every specialist and guest this app serves is in Armenia.
 */
export function normalizePhone(raw: string): NormalizedPhone | NormalizePhoneError {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");

  let national: string | null = null;
  if (digits.startsWith("00374")) {
    national = digits.slice(5);
  } else if (hasPlus && digits.startsWith("374")) {
    national = digits.slice(3);
  } else if (!hasPlus && digits.startsWith("374") && digits.length === 11) {
    national = digits.slice(3);
  } else if (digits.startsWith("0") && digits.length === NATIONAL_LENGTH + 1) {
    national = digits.slice(1);
  } else if (digits.length === NATIONAL_LENGTH) {
    national = digits;
  }

  if (!national || national.length !== NATIONAL_LENGTH) {
    return { error: "phoneInvalid" };
  }

  return { phone: `${COUNTRY_CODE}${national}` };
}
