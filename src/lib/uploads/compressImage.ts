// Client-side downscale/recompression for photo uploads. Phone cameras
// routinely produce 8-25MB images, which would blow past the server action
// body size limit (see next.config.ts) before the request even reaches our
// upload code — so large images are shrunk and re-encoded as JPEG in the
// browser before the form ever submits. Small images are left untouched to
// avoid a needless lossy round-trip.

const MAX_DIMENSION = 2000;
const TARGET_BYTES = 8 * 1024 * 1024; // stay well under the ~10MB server-side cap
const MIN_QUALITY = 0.5;
const MAX_ATTEMPTS = 6;

export async function compressImageFile(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  if (file.size <= TARGET_BYTES && scale === 1) {
    bitmap.close();
    return file;
  }

  let width = Math.round(bitmap.width * scale);
  let height = Math.round(bitmap.height * scale);

  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;

      ctx.drawImage(bitmap, 0, 0, width, height);

      const quality = Math.max(MIN_QUALITY, 0.85 - attempt * 0.1);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob) return file;

      const isLastAttempt = attempt === MAX_ATTEMPTS - 1;
      if (blob.size <= TARGET_BYTES || isLastAttempt) {
        return new File([blob], toJpegName(file.name), { type: "image/jpeg" });
      }

      width = Math.round(width * 0.75);
      height = Math.round(height * 0.75);
    }
    return file;
  } finally {
    bitmap.close();
  }
}

function toJpegName(name: string): string {
  return name.replace(/\.[^.]+$/, "") + ".jpg";
}

// Shared by the profile/cover/portfolio upload forms: compresses the
// selected file in place on the <input> (via DataTransfer, since File
// objects can't be mutated) and submits the form once that's done, so every
// upload path goes through the same size-limiting step before it hits the
// network.
export async function submitCompressedFile(
  input: HTMLInputElement,
  setCompressing: (value: boolean) => void,
): Promise<void> {
  const file = input.files?.[0];
  if (!file) return;

  setCompressing(true);
  try {
    const compressed = await compressImageFile(file);
    if (compressed !== file) {
      const transfer = new DataTransfer();
      transfer.items.add(compressed);
      input.files = transfer.files;
    }
    input.form?.requestSubmit();
  } finally {
    setCompressing(false);
  }
}
