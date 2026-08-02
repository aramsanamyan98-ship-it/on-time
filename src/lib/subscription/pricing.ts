import type { Plan } from "@/generated/prisma/client";

// 02_PRD.md Section 14 (updated): three paid tiers, monthly billing only
// (no free tier, no commitment-length discounts — every specialist who
// isn't inside their trial pays one of these monthly prices).
export const PLAN_PRICE_AMD: Record<Plan, number> = {
  basic: 4000,
  starter: 6000,
  pro: 12000,
};
