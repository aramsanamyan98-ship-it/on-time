type PageHeadingProps = {
  children: React.ReactNode;
  className?: string;
};

// Page-level title (h1) with the brand's small gold underline signature
// (docs/09_Brand_Guidelines.md — "a subtle gold underline ... under section
// headings as a small signature detail").
export function PageHeading({ children, className }: PageHeadingProps) {
  return (
    <div className={className}>
      <h1 className="heading-page">{children}</h1>
      <span className="heading-accent" aria-hidden="true" />
    </div>
  );
}

type CardHeadingProps = {
  children: React.ReactNode;
  className?: string;
};

// Compact heading for auth-card / modal-scale contexts.
export function CardHeading({ children, className }: CardHeadingProps) {
  return (
    <div className={className}>
      <h1 className="heading-card">{children}</h1>
      <span className="heading-accent-sm" aria-hidden="true" />
    </div>
  );
}

type SectionHeadingProps = {
  children: React.ReactNode;
  className?: string;
};

// Subsection heading (h2) — same signature, smaller scale.
export function SectionHeading({ children, className }: SectionHeadingProps) {
  return (
    <div className={className}>
      <h2 className="heading-section">{children}</h2>
      <span className="heading-accent-sm" aria-hidden="true" />
    </div>
  );
}
