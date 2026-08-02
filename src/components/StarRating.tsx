// Read-only star display shared by the public profile, dashboard reviews
// page/home stat, and the guest's own "thanks for your review" state
// (08_Roadmap.md Phase 9). No icon library is used anywhere else in this
// app, so plain glyph characters keep this dependency-free like the rest
// of the UI. Purely presentational — no client-only APIs — so it can be
// rendered from server or client components alike.
export function StarRating({
  value,
  className = "text-base",
  ariaLabel,
}: {
  value: number;
  className?: string;
  ariaLabel?: string;
}) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <span
      className={`text-brand-gold ${className}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {"★".repeat(filled)}
      {"☆".repeat(5 - filled)}
    </span>
  );
}
