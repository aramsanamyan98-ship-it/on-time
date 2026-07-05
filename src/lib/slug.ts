import { prisma } from "@/lib/prisma";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}

/**
 * Auto-generates a public slug from a display name (02_PRD.md Section 4:
 * "Public slug (auto-generated from name, editable once)"), guaranteeing
 * uniqueness with a random suffix on collision.
 */
export async function generateUniqueSlug(displayName: string): Promise<string> {
  const base = slugify(displayName) || "specialist";
  let candidate = base;

  while (await prisma.specialist.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${randomSuffix()}`;
  }

  return candidate;
}
