import { hasDisplayName } from "@/lib/profile/public-name";

export type SetupStepKey = "name" | "photo" | "services" | "workingHours";

export type SetupStep = { key: SetupStepKey; href: string; done: boolean };

export type SetupProgress = {
  steps: SetupStep[];
  doneCount: number;
  total: number;
  /** When true the "Build your account" card is not shown at all. */
  complete: boolean;
};

/**
 * What a new specialist still has to do before their booking page is useful.
 * Working hours count as set once the schedule has been saved at least once
 * (the app shows defaults until then, which a guest could not rely on).
 */
export function getSetupProgress(input: {
  displayName: string | null | undefined;
  profilePhotoUrl: string | null | undefined;
  activeServiceCount: number;
  workingHoursRowCount: number;
}): SetupProgress {
  const steps: SetupStep[] = [
    { key: "name", href: "/dashboard/profile", done: hasDisplayName(input.displayName) },
    { key: "photo", href: "/dashboard/profile", done: !!input.profilePhotoUrl },
    { key: "services", href: "/dashboard/services/new", done: input.activeServiceCount > 0 },
    { key: "workingHours", href: "/dashboard/working-hours", done: input.workingHoursRowCount > 0 },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return { steps, doneCount, total: steps.length, complete: doneCount === steps.length };
}
