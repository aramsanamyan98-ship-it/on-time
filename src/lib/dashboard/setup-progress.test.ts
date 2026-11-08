import { describe, expect, it } from "vitest";
import { getSetupProgress } from "@/lib/dashboard/setup-progress";

const empty = { displayName: "", profilePhotoUrl: null, activeServiceCount: 0, workingHoursRowCount: 0 };

describe("getSetupProgress", () => {
  it("starts at 0 of 4 for a brand-new account", () => {
    const p = getSetupProgress(empty);
    expect(p).toMatchObject({ doneCount: 0, total: 4, complete: false });
    expect(p.steps.map((s) => s.key)).toEqual(["name", "photo", "services", "workingHours"]);
  });

  it("ticks each item independently", () => {
    expect(getSetupProgress({ ...empty, displayName: "Anna" }).steps[0].done).toBe(true);
    expect(getSetupProgress({ ...empty, displayName: "   " }).steps[0].done).toBe(false);
    expect(getSetupProgress({ ...empty, profilePhotoUrl: "https://x/p.jpg" }).steps[1].done).toBe(true);
    expect(getSetupProgress({ ...empty, activeServiceCount: 1 }).steps[2].done).toBe(true);
    expect(getSetupProgress({ ...empty, workingHoursRowCount: 7 }).steps[3].done).toBe(true);
  });

  it("is complete (card hidden) only when all four are done", () => {
    const done = { displayName: "Anna", profilePhotoUrl: "https://x/p.jpg", activeServiceCount: 2, workingHoursRowCount: 7 };
    expect(getSetupProgress(done)).toMatchObject({ doneCount: 4, complete: true });
    expect(getSetupProgress({ ...done, activeServiceCount: 0 }).complete).toBe(false);
  });
});
