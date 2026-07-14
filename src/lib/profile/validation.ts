import type { FieldErrors } from "@/lib/dashboard/errors";

const BIO_MAX_LENGTH = 500;
const ADDRESS_MAX_LENGTH = 200;
const PHONE_RE = /^[0-9+()\-.\s]{6,20}$/;
const INSTAGRAM_HANDLE_RE = /^[a-zA-Z0-9._]{1,30}$/;

export type ProfileFields = "bio" | "phone" | "address" | "instagramUrl";

export function validateBio(bio: string): FieldErrors<ProfileFields> {
  if (bio.length > BIO_MAX_LENGTH) return { bio: "bioTooLong" };
  return {};
}

export function validatePhone(phone: string): FieldErrors<ProfileFields> {
  if (!phone) return {};
  if (!PHONE_RE.test(phone)) return { phone: "phoneInvalid" };
  return {};
}

export function validateAddress(address: string): FieldErrors<ProfileFields> {
  if (address.length > ADDRESS_MAX_LENGTH) return { address: "addressTooLong" };
  return {};
}

/**
 * Accepts a bare handle ("@name" / "name"), or a full instagram.com URL, and
 * normalizes it to "https://instagram.com/<handle>" for storage — so
 * whatever format the specialist pastes in, downstream consumers (public
 * profile page, Phase 3) can rely on a single consistent shape.
 */
export function normalizeInstagram(raw: string): { url: string } | { error: "instagramInvalid" } {
  const trimmed = raw.trim();
  if (!trimmed) return { url: "" };

  let handle = trimmed;
  const urlMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)\/?$/i);
  if (urlMatch) {
    handle = urlMatch[1];
  } else {
    handle = handle.replace(/^@/, "");
  }

  if (!INSTAGRAM_HANDLE_RE.test(handle)) {
    return { error: "instagramInvalid" };
  }

  return { url: `https://instagram.com/${handle}` };
}

export function validateProfileFields(fields: {
  bio: string;
  phone: string;
  address: string;
}): FieldErrors<ProfileFields> {
  return {
    ...validateBio(fields.bio),
    ...validatePhone(fields.phone),
    ...validateAddress(fields.address),
  };
}
