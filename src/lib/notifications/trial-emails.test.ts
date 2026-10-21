import { describe, expect, it } from "vitest";
import {
  getEligibleTrialEmail,
  TRIAL_ENDED_LOOKBACK_DAYS,
  type TrialEmailCandidate,
} from "@/lib/notifications/trial-emails";
import type { NotificationType } from "@/generated/prisma/client";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-21T00:00:00Z");
const none = new Set<NotificationType>();

function specialist(overrides: Partial<TrialEmailCandidate> = {}): TrialEmailCandidate {
  return {
    trialEndsAt: new Date(NOW.getTime() + 30 * DAY),
    subscriptionActiveUntil: null,
    emailVerifiedAt: new Date("2026-08-01T00:00:00Z"),
    deletedAt: null,
    ...overrides,
  };
}

const endsIn = (days: number) => ({ trialEndsAt: new Date(NOW.getTime() + days * DAY) });

describe("getEligibleTrialEmail — 7-day window", () => {
  it("sends nothing while more than 7 days remain", () => {
    expect(getEligibleTrialEmail(specialist(endsIn(30)), NOW, none)).toBeNull();
    expect(getEligibleTrialEmail(specialist(endsIn(7.01)), NOW, none)).toBeNull();
  });

  it("sends trial_ending_soon at exactly 7 days and anywhere inside the window", () => {
    expect(getEligibleTrialEmail(specialist(endsIn(7)), NOW, none)).toBe("trial_ending_soon");
    expect(getEligibleTrialEmail(specialist(endsIn(3)), NOW, none)).toBe("trial_ending_soon");
    expect(getEligibleTrialEmail(specialist(endsIn(0.01)), NOW, none)).toBe("trial_ending_soon");
  });

  it("sends trial_ended once trialEndsAt is reached or passed", () => {
    expect(getEligibleTrialEmail(specialist(endsIn(0)), NOW, none)).toBe("trial_ended");
    expect(getEligibleTrialEmail(specialist(endsIn(-5)), NOW, none)).toBe("trial_ended");
  });

  it("stops sending trial_ended after the lookback cap", () => {
    expect(getEligibleTrialEmail(specialist(endsIn(-TRIAL_ENDED_LOOKBACK_DAYS)), NOW, none)).toBe("trial_ended");
    expect(getEligibleTrialEmail(specialist(endsIn(-TRIAL_ENDED_LOOKBACK_DAYS - 0.01)), NOW, none)).toBeNull();
    expect(getEligibleTrialEmail(specialist(endsIn(-90)), NOW, none)).toBeNull();
  });

  it("sends nothing without a trialEndsAt", () => {
    expect(getEligibleTrialEmail(specialist({ trialEndsAt: null }), NOW, none)).toBeNull();
  });
});

describe("getEligibleTrialEmail — already sent", () => {
  it("does not repeat trial_ending_soon", () => {
    expect(getEligibleTrialEmail(specialist(endsIn(3)), NOW, new Set<NotificationType>(["trial_ending_soon"]))).toBeNull();
  });

  it("does not repeat trial_ended", () => {
    expect(getEligibleTrialEmail(specialist(endsIn(-1)), NOW, new Set<NotificationType>(["trial_ended"]))).toBeNull();
  });

  it("still sends trial_ended after trial_ending_soon was sent", () => {
    expect(getEligibleTrialEmail(specialist(endsIn(-1)), NOW, new Set<NotificationType>(["trial_ending_soon"]))).toBe(
      "trial_ended",
    );
  });

  it("ignores unrelated appointment notification types", () => {
    expect(getEligibleTrialEmail(specialist(endsIn(3)), NOW, new Set<NotificationType>(["reminder"]))).toBe(
      "trial_ending_soon",
    );
  });
});

describe("getEligibleTrialEmail — already subscribed", () => {
  const subscribed = { subscriptionActiveUntil: new Date(NOW.getTime() + 60 * DAY) };

  it("skips trial_ending_soon for an active subscriber", () => {
    expect(getEligibleTrialEmail(specialist({ ...endsIn(3), ...subscribed }), NOW, none)).toBeNull();
  });

  it("skips trial_ended for an active subscriber", () => {
    expect(getEligibleTrialEmail(specialist({ ...endsIn(-3), ...subscribed }), NOW, none)).toBeNull();
  });

  it("does not treat a lapsed subscription as active", () => {
    const lapsed = { subscriptionActiveUntil: new Date(NOW.getTime() - DAY) };
    expect(getEligibleTrialEmail(specialist({ ...endsIn(-3), ...lapsed }), NOW, none)).toBe("trial_ended");
  });

  it("treats a subscription ending exactly now as lapsed", () => {
    expect(getEligibleTrialEmail(specialist({ ...endsIn(-3), subscriptionActiveUntil: NOW }), NOW, none)).toBe(
      "trial_ended",
    );
  });
});

describe("getEligibleTrialEmail — accounts that shouldn't be emailed", () => {
  it("skips unverified specialists", () => {
    expect(getEligibleTrialEmail(specialist({ ...endsIn(3), emailVerifiedAt: null }), NOW, none)).toBeNull();
  });

  it("skips deleted specialists", () => {
    expect(getEligibleTrialEmail(specialist({ ...endsIn(-3), deletedAt: new Date("2026-10-01T00:00:00Z") }), NOW, none)).toBeNull();
  });
});
