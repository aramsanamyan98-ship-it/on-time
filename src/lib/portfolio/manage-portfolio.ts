import { prisma } from "@/lib/prisma";
import { saveUploadedImage, deleteUploadedImage } from "@/lib/storage";
import type { ActionResult } from "@/lib/dashboard/errors";
import type { PortfolioPhoto } from "@/generated/prisma/client";

export async function addPortfolioPhoto(
  specialistId: string,
  file: File | null,
): Promise<ActionResult<PortfolioPhoto>> {
  const uploadResult = await saveUploadedImage(file, specialistId, "portfolio");
  if (!uploadResult.ok) {
    return { ok: false, formError: uploadResult.error };
  }

  const last = await prisma.portfolioPhoto.findFirst({
    where: { specialistId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const photo = await prisma.portfolioPhoto.create({
    data: { specialistId, imageUrl: uploadResult.url, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });

  return { ok: true, data: photo };
}

export async function deletePortfolioPhoto(
  specialistId: string,
  photoId: string,
): Promise<ActionResult<undefined>> {
  const existing = await prisma.portfolioPhoto.findFirst({ where: { id: photoId, specialistId } });
  if (!existing) return { ok: false, formError: "notFound" };

  await prisma.portfolioPhoto.delete({ where: { id: photoId } });
  await deleteUploadedImage(existing.imageUrl);

  return { ok: true, data: undefined };
}

// Swaps sortOrder with the adjacent photo rather than renumbering the whole
// list, since only one photo ever moves per action.
export async function movePortfolioPhoto(
  specialistId: string,
  photoId: string,
  direction: "up" | "down",
): Promise<ActionResult<undefined>> {
  const photos = await prisma.portfolioPhoto.findMany({
    where: { specialistId },
    orderBy: { sortOrder: "asc" },
  });

  const index = photos.findIndex((photo) => photo.id === photoId);
  if (index === -1) return { ok: false, formError: "notFound" };

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= photos.length) return { ok: true, data: undefined };

  const current = photos[index];
  const swapWith = photos[swapIndex];

  await prisma.$transaction([
    prisma.portfolioPhoto.update({ where: { id: current.id }, data: { sortOrder: swapWith.sortOrder } }),
    prisma.portfolioPhoto.update({ where: { id: swapWith.id }, data: { sortOrder: current.sortOrder } }),
  ]);

  return { ok: true, data: undefined };
}
