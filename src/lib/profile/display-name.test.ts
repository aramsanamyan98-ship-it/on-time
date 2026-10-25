import { beforeEach, describe, expect, it, vi } from "vitest";

const update = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { specialist: { update: (...args: unknown[]) => update(...args) } } }));
vi.mock("@/lib/storage", () => ({ saveUploadedImage: vi.fn(), deleteUploadedImage: vi.fn() }));

import { normalizeDisplayName, validateDisplayName } from "@/lib/profile/validation";
import { updateDisplayName } from "@/lib/profile/update-profile";

const check = (raw: string) => validateDisplayName(normalizeDisplayName(raw)).displayName;

describe("validateDisplayName", () => {
  it.each(["Anna", "Աննա Սարգսյան", "Анна Иванова", "Mary-Jane O'Neil", "Անի’ս", "Ян"])("accepts %s", (name) => {
    expect(check(name)).toBeUndefined();
  });

  it("requires a value and trims whitespace", () => {
    expect(check("")).toBe("displayNameRequired");
    expect(check("    ")).toBe("displayNameRequired");
    expect(normalizeDisplayName("  Anna   K  ")).toBe("Anna K");
  });

  it("enforces 2 to 60 characters", () => {
    expect(check("A")).toBe("displayNameTooShort");
    expect(check("A".repeat(60))).toBeUndefined();
    expect(check("A".repeat(61))).toBe("displayNameTooLong");
  });

  it.each(["<b>Anna</b>", "Anna & Co", "Anna2", "Anna_K", "-Anna", "Anna-", "日本語", "Anna​"])(
    "rejects %s",
    (name) => {
      expect(check(name)).toBe("displayNameInvalid");
    },
  );
});

describe("updateDisplayName", () => {
  beforeEach(() => {
    update.mockReset();
    update.mockImplementation(async ({ data }) => ({ id: "me", displayName: data.displayName }));
  });

  it("only writes to the given specialist's row, without touching the slug", async () => {
    const result = await updateDisplayName("specialist-a", "  New   Name ");
    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ where: { id: "specialist-a" }, data: { displayName: "New Name" } });
  });

  it("cannot be pointed at another specialist by the name input", async () => {
    await updateDisplayName("specialist-a", "Anna");
    expect(update.mock.calls[0][0].where).toEqual({ id: "specialist-a" });
  });

  it("does not hit the database for invalid names", async () => {
    const result = await updateDisplayName("specialist-a", "<script>");
    expect(result).toEqual({ ok: false, fieldErrors: { displayName: "displayNameInvalid" } });
    expect(update).not.toHaveBeenCalled();
  });
});
