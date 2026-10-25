import type { FieldErrors } from "@/lib/dashboard/errors";

const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 60;
// Armenian, Cyrillic and Latin letters plus digits and periods, joined by
// spaces, hyphens or apostrophes — which also rules out HTML (< > &),
// underscores and control characters. Must start and end with a letter,
// digit or period (no leading/trailing hyphen).
const NAME_CHAR = "[\\p{Script=Armenian}\\p{Script=Cyrillic}\\p{Script=Latin}0-9.]";
const DISPLAY_NAME_RE = new RegExp(`^${NAME_CHAR}+(?:[ \\-'\u2019\u055A]+${NAME_CHAR}+)*$`, "u");
const BIO_MAX_LENGTH = 500;
const ADDRESS_MAX_LENGTH = 200;
const PHONE_RE = /^[0-9+()\-.\s]{6,20}$/;
const INSTAGRAM_HANDLE_RE = /^[a-zA-Z0-9._]{1,30}$/;
const FACEBOOK_HANDLE_RE = /^[a-zA-Z0-9.]{5,50}$/;

export type ProfileFields = "displayName" | "bio" | "phone" | "address" | "instagramUrl" | "facebookUrl";

/** Trims and collapses inner whitespace, so "  Anna   K " is stored as "Anna K". */
export function normalizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Expects an already-normalized name (see normalizeDisplayName). */
export function validateDisplayName(name: string): FieldErrors<ProfileFields> {
  if (!name) return { displayName: "displayNameRequired" };
  const length = Array.from(name).length;
  if (length < DISPLAY_NAME_MIN_LENGTH) return { displayName: "displayNameTooShort" };
  if (length > DISPLAY_NAME_MAX_LENGTH) return { displayName: "displayNameTooLong" };
  if (!DISPLAY_NAME_RE.test(name)) return { displayName: "displayNameInvalid" };
  return {};
}

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

/**
 * Same idea as normalizeInstagram: accepts a bare handle ("@name" / "name"),
 * a numeric profile id, or a full facebook.com URL (including the
 * "profile.php?id=" form Facebook uses for accounts without a custom
 * username), and normalizes it to a single facebook.com URL shape.
 */
export function normalizeFacebook(raw: string): { url: string } | { error: "facebookInvalid" } {
  const trimmed = raw.trim();
  if (!trimmed) return { url: "" };

  const idUrlMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?facebook\.com\/profile\.php\?id=(\d+)/i);
  if (idUrlMatch) {
    return { url: `https://facebook.com/profile.php?id=${idUrlMatch[1]}` };
  }

  let handle = trimmed;
  const urlMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?facebook\.com\/([^/?#]+)\/?$/i);
  if (urlMatch) {
    handle = urlMatch[1];
  } else {
    handle = handle.replace(/^@/, "");
  }

  if (!FACEBOOK_HANDLE_RE.test(handle)) {
    return { error: "facebookInvalid" };
  }

  return { url: `https://facebook.com/${handle}` };
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
