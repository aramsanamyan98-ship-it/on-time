import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { isAppointmentReviewable } from "@/lib/reviews/eligibility";
import type { ReviewActionResult, ReviewFieldErrors } from "@/lib/reviews/errors";
import type { Review } from "@/generated/prisma/client";

const MAX_COMMENT_LENGTH = 1000;

export function validateReviewInput(rating: number, comment: string): ReviewFieldErrors<"rating" | "comment"> {
  const fieldErrors: ReviewFieldErrors<"rating" | "comment"> = {};
  if (!Number.isFinite(rating) || rating === 0) {
    fieldErrors.rating = "ratingRequired";
  } else if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    fieldErrors.rating = "ratingInvalid";
  }
  if (comment.length > MAX_COMMENT_LENGTH) fieldErrors.comment = "commentTooLong";
  return fieldErrors;
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * Guest-authored, one-shot (08_Roadmap.md Phase 9): `token` is the same
 * booking_token used for self-service cancel/reschedule, eligibility is
 * time-based (see eligibility.ts), and `appointmentId`'s DB unique
 * constraint is the actual enforcement of "one review per appointment, no
 * editing" — the pre-check below just produces a clean error message for
 * the common (non-racing) case instead of surfacing a raw DB conflict.
 */
export async function submitReview(
  token: string,
  rating: number,
  comment: string,
): Promise<ReviewActionResult<Review>> {
  const appointment = await prisma.appointment.findUnique({ where: { bookingToken: token } });
  if (!appointment) return { ok: false, formError: "notFound" };

  const fieldErrors = validateReviewInput(rating, comment);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  if (!isAppointmentReviewable(appointment)) return { ok: false, formError: "reviewNotEligibleYet" };

  const existing = await prisma.review.findUnique({ where: { appointmentId: appointment.id } });
  if (existing) return { ok: false, formError: "alreadyReviewed" };

  try {
    const review = await prisma.review.create({
      data: {
        appointmentId: appointment.id,
        specialistId: appointment.specialistId,
        rating,
        comment: comment.trim() || null,
      },
    });
    return { ok: true, data: review };
  } catch (err) {
    // Race backstop: two concurrent submits for the same appointment (e.g.
    // a double-click or two open tabs) — the loser hits the same unique
    // constraint the pre-check above is checking, just after the fact.
    if (isUniqueConstraintError(err)) return { ok: false, formError: "alreadyReviewed" };
    throw err;
  }
}
