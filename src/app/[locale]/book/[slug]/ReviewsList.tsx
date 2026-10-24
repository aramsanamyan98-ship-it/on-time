"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { StarRating } from "@/components/StarRating";

export type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  serviceName: string;
  dateLabel: string;
};

const INITIAL_COUNT = 3;

// Dates are formatted server-side and passed in as strings (same reason as
// the dashboard AppointmentRow: avoids server/browser ICU hydration drift).
export function ReviewsList({ reviews }: { reviews: ReviewItem[] }) {
  const t = useTranslations("PublicProfile");
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? reviews : reviews.slice(0, INITIAL_COUNT);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
        {visible.map((review) => (
          <li
            key={review.id}
            className="flex flex-col gap-2 rounded-2xl border border-brand-card-border bg-white p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <strong className="text-[0.9375rem] font-semibold text-brand-charcoal">{review.authorName}</strong>
              <span className="text-xs text-brand-muted">{review.dateLabel}</span>
            </div>
            <StarRating value={review.rating} ariaLabel={t("ratingAriaLabel", { rating: review.rating })} />
            <span className="text-xs text-brand-muted">{review.serviceName}</span>
            {review.comment && <p className="text-sm text-brand-charcoal/85">{review.comment}</p>}
          </li>
        ))}
      </ul>
      {reviews.length > INITIAL_COUNT && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="min-h-11 self-center text-sm font-semibold text-brand-green hover:underline"
        >
          {expanded ? t("fewerReviews") : t("allReviews", { count: reviews.length })}
        </button>
      )}
    </div>
  );
}
