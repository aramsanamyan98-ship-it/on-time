import { beforeEach, describe, expect, it, vi } from "vitest";

const update = vi.fn();
const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    specialist: {
      update: (...args: unknown[]) => update(...args),
      findUnique: (...args: unknown[]) => findUnique(...args),
    },
  },
}));
vi.mock("@/lib/storage", () => ({ saveUploadedImage: vi.fn(), deleteUploadedImage: vi.fn() }));

import { normalizeSlug, validateSlug } from "@/lib/profile/validation";
import { updateSlug } from "@/lib/profile/update-profile";

const check = (raw: string) => validateSlug(normalizeSlug(raw)).slug;

describe("validateSlug", () => {
  it.each(["anna", "anna-k", "studio54", "a1-b2-c3", "abc"])("accepts %s", (slug) => {
    expect(check(slug)).toBeUndefined();
  });

  it("requires a value and trims/lowercases/hyphenates whitespace", () => {
    expect(check("")).toBe("slugRequired");
    expect(check("   ")).toBe("slugRequired");
    expect(normalizeSlug("  Anna   K  ")).toBe("anna-k");
  });

  it("enforces 3 to 40 characters", () => {
    expect(check("ab")).toBe("slugTooShort");
    expect(check("a".repeat(40))).toBeUndefined();
    expect(check("a".repeat(41))).toBe("slugTooLong");
  });

  it.each(["-anna", "anna-", "anna--k", "Anna", "anna_k", "anna.k", "日本語", "<script>"])("rejects %s", (slug) => {
    expect(check(slug)).toBe("slugInvalid");
  });

  it.each(["new", "book", "dashboard", "login", "admin", "api"])("rejects the reserved slug %s", (slug) => {
    expect(check(slug)).toBe("slugReserved");
  });
});

describe("updateSlug", () => {
  beforeEach(() => {
    update.mockReset();
    findUnique.mockReset();
    findUnique.mockResolvedValue(null);
    update.mockImplementation(async ({ data }) => ({ id: "specialist-a", ...data }));
  });

  it("only writes to the given specialist's row", async () => {
    const result = await updateSlug("specialist-a", "  New   Slug ");
    expect(result.ok).toBe(true);
    expect(findUnique).toHaveBeenCalledWith({ where: { slug: "new-slug" }, select: { id: true } });
    expect(update).toHaveBeenCalledWith({ where: { id: "specialist-a" }, data: { slug: "new-slug" } });
  });

  it("does not hit the database for invalid slugs", async () => {
    const result = await updateSlug("specialist-a", "Invalid Slug!");
    expect(result).toEqual({ ok: false, fieldErrors: { slug: "slugInvalid" } });
    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a slug already taken by another specialist", async () => {
    findUnique.mockResolvedValue({ id: "specialist-b" });
    const result = await updateSlug("specialist-a", "taken-slug");
    expect(result).toEqual({ ok: false, fieldErrors: { slug: "slugTaken" } });
    expect(update).not.toHaveBeenCalled();
  });

  it("allows re-saving the specialist's own current slug", async () => {
    findUnique.mockResolvedValue({ id: "specialist-a" });
    const result = await updateSlug("specialist-a", "anna-k");
    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith({ where: { id: "specialist-a" }, data: { slug: "anna-k" } });
  });
});
