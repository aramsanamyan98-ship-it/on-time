import "server-only";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

// Local-disk storage for specialist-uploaded images (profile/cover photos).
// Files land in public/uploads/{specialistId}/ so they're served as static
// assets without a dedicated route handler. This is fine for local dev and
// a single-instance deploy; if this app ever runs on infrastructure with an
// ephemeral or read-only filesystem (e.g. Vercel serverless), swap this
// module for an object-storage backed one — every caller only depends on
// saveUploadedImage/deleteUploadedImage, not on the disk layout.

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type UploadErrorCode = "fileRequired" | "fileTooLarge" | "fileTypeInvalid";

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: UploadErrorCode };

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

export async function saveUploadedImage(
  file: File | null,
  specialistId: string,
  kind: "profile" | "cover" | "portfolio",
): Promise<UploadResult> {
  if (!file || file.size === 0) {
    return { ok: false, error: "fileRequired" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "fileTooLarge" };
  }
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return { ok: false, error: "fileTypeInvalid" };
  }

  const dir = path.join(UPLOADS_ROOT, specialistId);
  await mkdir(dir, { recursive: true });

  const filename = `${kind}-${Date.now()}-${randomBytes(4).toString("hex")}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  return { ok: true, url: `/uploads/${specialistId}/${filename}` };
}

// Best-effort cleanup of a previously uploaded file when it's replaced.
// Failures are swallowed: a stray orphaned file on disk is harmless, but
// failing to save the new photo because the old one couldn't be deleted
// would not be.
export async function deleteUploadedImage(url: string | null): Promise<void> {
  if (!url || !url.startsWith("/uploads/")) return;
  const filePath = path.join(process.cwd(), "public", url);
  try {
    await unlink(filePath);
  } catch {
    // ignore
  }
}
