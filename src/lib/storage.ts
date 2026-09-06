import "server-only";
import { randomBytes } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase Storage-backed storage for specialist-uploaded images (profile,
// cover, and portfolio photos). Vercel's serverless filesystem is ephemeral
// (and read-only outside /tmp), so files can't live on local disk the way
// they could in a single-instance deploy — they're uploaded to a public
// Storage bucket instead, and callers get back the bucket's public URL.
// Every caller only depends on saveUploadedImage/deleteUploadedImage, not on
// how or where the file is actually stored.

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Matches the bucket name as created in Supabase (case-sensitive).
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "Uploads";

export type UploadErrorCode = "fileRequired" | "fileTooLarge" | "fileTypeInvalid";

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: UploadErrorCode };

let cachedClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to upload files to Supabase Storage.",
    );
  }

  // Server-only client using the service role key, which bypasses Storage
  // RLS. That's safe here because every caller already checks the caller's
  // session before reaching this module — the bucket itself has no public
  // write access.
  cachedClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

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

  const objectPath = `${specialistId}/${kind}-${Date.now()}-${randomBytes(4).toString("hex")}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    throw new Error(`Failed to upload ${objectPath} to Supabase Storage: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return { ok: true, url: data.publicUrl };
}

// Best-effort cleanup of a previously uploaded file when it's replaced.
// Failures are swallowed: a stray orphaned object in the bucket is harmless,
// but failing to save the new photo because the old one couldn't be deleted
// would not be.
export async function deleteUploadedImage(url: string | null): Promise<void> {
  const objectPath = toObjectPath(url);
  if (!objectPath) return;

  try {
    await getSupabaseClient().storage.from(BUCKET).remove([objectPath]);
  } catch {
    // ignore
  }
}

// Recovers the bucket-relative object path from a public Storage URL, e.g.
// "https://<project>.supabase.co/storage/v1/object/public/Uploads/<path>"
// -> "<path>". Returns null for anything else (already-deleted files,
// legacy local-disk "/uploads/..." URLs from before this migration, etc.).
function toObjectPath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}
