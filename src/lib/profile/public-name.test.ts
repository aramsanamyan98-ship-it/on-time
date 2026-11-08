import { describe, expect, it } from "vitest";
import { displayNameOrFallback, hasDisplayName } from "@/lib/profile/public-name";

describe("hasDisplayName", () => {
  it.each(["Anna", "  Anna  ", "Ян"])("is true for %j", (name) => {
    expect(hasDisplayName(name)).toBe(true);
  });

  it.each(["", "   ", "\t\n", null, undefined])("is false for %j", (name) => {
    expect(hasDisplayName(name)).toBe(false);
  });
});

describe("displayNameOrFallback", () => {
  it("returns the trimmed name when there is one", () => {
    expect(displayNameOrFallback("  Anna K ", "Your name")).toBe("Anna K");
  });

  it("returns the fallback for an unnamed profile, never an empty string", () => {
    expect(displayNameOrFallback("", "Your name")).toBe("Your name");
    expect(displayNameOrFallback("   ", "Your name")).toBe("Your name");
    expect(displayNameOrFallback(null, "Your name")).toBe("Your name");
  });
});
