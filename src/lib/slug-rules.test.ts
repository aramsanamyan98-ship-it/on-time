import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS, isBookableSlug } from "@/lib/slug-rules";
import { validateSlug } from "@/lib/profile/validation";

const root = path.resolve(__dirname, "../..");

/** Folder names that become top-level URL segments under src/app/[locale], looking through (route groups) and @slots. */
function topLevelSegments(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("@")) continue;
    if (entry.name.startsWith("(")) {
      out.push(...topLevelSegments(path.join(dir, entry.name)));
    } else if (!entry.name.startsWith("[")) {
      out.push(entry.name);
    }
  }
  return out;
}

describe("reserved slugs", () => {
  it("covers every top-level page under src/app/[locale]", () => {
    const pages = topLevelSegments(path.join(root, "src/app/[locale]"));
    expect(pages.length).toBeGreaterThan(5);
    for (const page of pages) expect(RESERVED_SLUGS.has(page), `"${page}" must be reserved`).toBe(true);
  });

  it("covers every top-level folder under src/app and public/", () => {
    const appDirs = fs
      .readdirSync(path.join(root, "src/app"), { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("[") && !e.name.startsWith("("))
      .map((e) => e.name);
    const publicDirs = fs
      .readdirSync(path.join(root, "public"), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    for (const name of [...appDirs, ...publicDirs]) expect(RESERVED_SLUGS.has(name), `"${name}" must be reserved`).toBe(true);
  });

  it.each(["login", "dashboard", "api", "admin", "register", "hy", "ru", "en", "book", "booking", "new"])(
    "rejects %s as a slug",
    (word) => {
      expect(RESERVED_SLUGS.has(word)).toBe(true);
      expect(isBookableSlug(word)).toBe(false);
      // validateSlug reports length first for 2-letter language codes; either way it is rejected.
      expect(validateSlug(word)).not.toEqual({});
    },
  );

  it("reports slugReserved for a reserved word of valid length", () => {
    expect(validateSlug("dashboard")).toEqual({ slug: "slugReserved" });
    expect(validateSlug("admin")).toEqual({ slug: "slugReserved" });
  });

  it("allows ordinary and placeholder slugs", () => {
    for (const slug of ["anna", "anna-k", "studio-54", "page-3f9a1c7b2e"]) {
      expect(isBookableSlug(slug)).toBe(true);
      expect(validateSlug(slug)).toEqual({});
    }
  });
});
