import { prisma } from "@/lib/prisma";

export type ReviewStats = { average: number | null; count: number };

export async function getReviewStats(specialistId: string): Promise<ReviewStats> {
  const result = await prisma.review.aggregate({
    where: { specialistId },
    _avg: { rating: true },
    _count: true,
  });
  return { average: result._avg.rating, count: result._count };
}

/** First whitespace-separated token of the guest's name, or null if empty — the caller decides how to render "no name". */
function firstNameOf(guestName: string): string | null {
  const trimmed = guestName.trim();
  return trimmed ? trimmed.split(/\s+/)[0] : null;
}

export type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  firstName: string | null;
};

/**
 * Public profile display (02_PRD.md Section 14, Starter+): deliberately
 * selects only `guestName` off the related appointment — no phone, no
 * full name — and reduces even that down to a first name/null, so the
 * privacy boundary is enforced by what this query reads, not by trusting
 * every call site to redact it correctly.
 */
export async function listReviewsForPublicProfile(specialistId: string): Promise<PublicReview[]> {
  const reviews = await prisma.review.findMany({
    where: { specialistId },
    orderBy: { createdAt: "desc" },
    include: { appointment: { select: { guestName: true } } },
  });

  return reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    firstName: firstNameOf(review.appointment.guestName),
  }));
}

export type DashboardReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  guestName: string;
  serviceName: string;
  appointmentDate: Date;
};

/**
 * Dashboard listing (specialists can view but never delete/hide — see
 * 08_Roadmap.md Phase 9): full guest name and service context are shown
 * here since the specialist already has full access to this guest's
 * appointment details elsewhere (Clients/Appointments pages) — the
 * anonymization in listReviewsForPublicProfile is specifically about what
 * *guests* see on the public page, not a restriction on the specialist's
 * own view of their data.
 */
export async function listReviewsForDashboard(specialistId: string): Promise<DashboardReview[]> {
  const reviews = await prisma.review.findMany({
    where: { specialistId },
    orderBy: { createdAt: "desc" },
    include: { appointment: { include: { service: true } } },
  });

  return reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    guestName: review.appointment.guestName,
    serviceName: review.appointment.service.name,
    appointmentDate: review.appointment.startAt,
  }));
}
