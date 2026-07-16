import type { BookingFieldErrors } from "@/lib/booking/errors";

const NAME_MAX_LENGTH = 100;
const NOTES_MAX_LENGTH = 500;
const PHONE_RE = /^[0-9+()\-.\s]{6,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type GuestFields = "name" | "phone" | "email" | "notes";

export type GuestDetailsInput = { name: string; phone: string; email: string; notes: string };

// 02_PRD.md Section 7: guest enters name and phone; email is optional.
export function validateGuestDetails(input: GuestDetailsInput): BookingFieldErrors<GuestFields> {
  const errors: BookingFieldErrors<GuestFields> = {};

  const name = input.name.trim();
  if (!name) errors.name = "nameRequired";
  else if (name.length > NAME_MAX_LENGTH) errors.name = "nameTooLong";

  const phone = input.phone.trim();
  if (!phone) errors.phone = "phoneRequired";
  else if (!PHONE_RE.test(phone)) errors.phone = "phoneInvalid";

  const email = input.email.trim();
  if (email && !EMAIL_RE.test(email)) errors.email = "emailInvalid";

  if (input.notes.trim().length > NOTES_MAX_LENGTH) errors.notes = "notesTooLong";

  return errors;
}
