import { prisma } from "@/lib/prisma";
import { saveUploadedImage, deleteUploadedImage } from "@/lib/storage";
import { validateProfileFields, normalizeInstagram } from "@/lib/profile/validation";
import type { ActionResult } from "@/lib/dashboard/errors";
import type { Specialist } from "@/generated/prisma/client";

export async function updateSpecialistProfile(
  specialistId: string,
  fields: { bio: string; phone: string; address: string; instagram: string },
): Promise<ActionResult<Specialist>> {
  const fieldErrors = validateProfileFields(fields);
  const instagramResult = normalizeInstagram(fields.instagram);
  if ("error" in instagramResult) {
    fieldErrors.instagramUrl = instagramResult.error;
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
