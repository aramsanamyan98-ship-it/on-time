import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Neutral placeholder slug for brand-new accounts ("page-3f9a1c7b2e"): purely
 * random, so nothing about the person (email, name) leaks into the URL. The
 * specialist can replace it from the profile page. Valid per validateSlug
 * (src/lib/profile/validation.ts), unique via a retry on collision.
 */
export async function generateTemporarySlug(): Promise<string> {
  for (;;) {
    const candidate = `page-${randomBytes(5).toString("hex")}`;
    const taken = await prisma.specialist.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
}
