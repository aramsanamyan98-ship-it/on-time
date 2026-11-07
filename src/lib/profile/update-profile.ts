import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { saveUploadedImage, deleteUploadedImage } from "@/lib/storage";
import {
  validateProfileFields,
  normalizeDisplayName,
  validateDisplayName,
  normalizeSlug,
  validateSlug,
  normalizeInstagram,
  normalizeFacebook,
} from "@/lib/profile/validation";
import type { ActionResult } from "@/lib/dashboard/errors";
import type { Specialist } from "@/generated/prisma/client";

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** Only ever updates the row for `specialistId`; the slug is deliberately left alone — see updateSlug for that. */
export async function updateDisplayName(specialistId: string, raw: string): Promise<ActionResult<Specialist>> {
  const displayName = normalizeDisplayName(raw);
  const fieldErrors = validateDisplayName(displayName);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const specialist = await prisma.specialist.update({
    where: { id: specialistId },
    data: { displayName },
  });
  return { ok: true, data: specialist };
}

/**
 * Changes the public booking-page slug (book.ontime.am/[slug]) on demand —
 * 02_PRD.md Section 4 calls for this to exist; the dashboard UI surfaces it
 * with an explicit warning that previously shared booking links will stop
 * working, since nothing here keeps the old slug alive as a redirect.
 *
 * The pre-check gives a clean "slugTaken" error for the common case; the
 * unique constraint on Specialist.slug is the actual enforcement against a
 * same-instant race with another specialist claiming the same slug.
 */
export async function updateSlug(specialistId: string, raw: string): Promise<ActionResult<Specialist>> {
  const slug = normalizeSlug(raw);
  const fieldErrors = validateSlug(slug);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const existing = await prisma.specialist.findUnique({ where: { slug }, select: { id: true } });
  if (existing && existing.id !== specialistId) {
    return { ok: false, fieldErrors: { slug: "slugTaken" } };
  }

  try {
    const specialist = await prisma.specialist.update({
      where: { id: specialistId },
      data: { slug },
    });
    return { ok: true, data: specialist };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { ok: false, fieldErrors: { slug: "slugTaken" } };
    }
    throw err;
  }
}

export async function updateSpecialistProfile(
  specialistId: string,
  fields: { bio: string; phone: string; address: string; instagram: string; facebook: string },
): Promise<ActionResult<Specialist>> {
  const fieldErrors = validateProfileFields(fields);
  const instagramResult = normalizeInstagram(fields.instagram);
  if ("error" in instagramResult) {
    fieldErrors.instagramUrl = instagramResult.error;
  }
  const facebookResult = normalizeFacebook(fields.facebook);
  if ("error" in facebookResult) {
    fieldErrors.facebookUrl = facebookResult.error;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const specialist = await prisma.specialist.update({
    where: { id: specialistId },
    data: {
      bio: fields.bio.trim() || null,
      phone: fields.phone.trim() || null,
      address: fields.address.trim() || null,
      instagramUrl: "url" in instagramResult && instagramResult.url ? instagramResult.url : null,
      facebookUrl: "url" in facebookResult && facebookResult.url ? facebookResult.url : null,
    },
  });

  return { ok: true, data: specialist };
}

export async function updateProfilePhoto(
  specialistId: string,
  file: File | null,
  kind: "profile" | "cover",
): Promise<ActionResult<Specialist>> {
  const uploadResult = await saveUploadedImage(file, specialistId, kind);
  if (!uploadResult.ok) {
    return { ok: false, formError: uploadResult.error };
  }

  const current = await prisma.specialist.findUnique({
    where: { id: specialistId },
    select: { profilePhotoUrl: true, coverPhotoUrl: true },
  });

  const specialist = await prisma.specialist.update({
    where: { id: specialistId },
    data: kind === "profile" ? { profilePhotoUrl: uploadResult.url } : { coverPhotoUrl: uploadResult.url },
  });

  const previousUrl = kind === "profile" ? current?.profilePhotoUrl : current?.coverPhotoUrl;
  if (previousUrl && previousUrl !== uploadResult.url) {
    await deleteUploadedImage(previousUrl);
  }

  return { ok: true, data: specialist };
}
