import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    specialist: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      create: (...a: unknown[]) => create(...a),
    },
    emailVerificationToken: { create: vi.fn() },
  },
}));
vi.mock("@/lib/password", () => ({ hashPassword: async () => "hash" }));
vi.mock("@/lib/mailer", () => ({ sendEmail: vi.fn() }));

import { registerSpecialist } from "@/lib/auth/register";
import { validateSlug } from "@/lib/profile/validation";

describe("registerSpecialist", () => {
  beforeEach(() => {
    create.mockReset();
    findUnique.mockReset();
    findUnique.mockResolvedValue(null);
    create.mockImplementation(async ({ data }) => ({ id: "s1", ...data }));
    process.env.APP_URL = "https://x.test";
  });

  it("starts with an empty name and a neutral slug that does not come from the email", async () => {
    const result = await registerSpecialist("anna.karapetyan@example.com", "Password123!", "Password123!", "en");
    expect(result.ok).toBe(true);

    const data = create.mock.calls[0][0].data;
    expect(data.displayName).toBe("");
    expect(data.slug).toMatch(/^page-[0-9a-f]{10}$/);
    expect(data.slug).not.toContain("anna");
    expect(data.slug).not.toContain("karapetyan");
    expect(validateSlug(data.slug)).toEqual({});
  });

  it("retries the temporary slug when it is already taken", async () => {
    findUnique
      .mockResolvedValueOnce(null) // email lookup
      .mockResolvedValueOnce({ id: "other" }) // first slug candidate taken
      .mockResolvedValue(null);
    await registerSpecialist("b@example.com", "Password123!", "Password123!", "en");
    expect(findUnique).toHaveBeenCalledTimes(3);
  });
});
