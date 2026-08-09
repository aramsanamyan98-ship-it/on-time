// Small outline icon set for the public profile's contact section. Kept as
// plain inline SVG rather than pulling in an icon library, following the
// same no-icon-dependency convention as StarRating.tsx.
type IconProps = {
  className?: string;
};

const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function PhoneIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5V19a2 2 0 0 1-2 2c-7.732 0-14-6.268-14-14a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

export function PinIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M12 21s7-6.373 7-11.5A7 7 0 0 0 5 9.5C5 14.627 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.25" />
    </svg>
  );
}

export function InstagramIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M14 21v-7.5h2.5l.5-3H14V8.5c0-1 .333-1.75 1.75-1.75H17V4.14C16.667 4.097 15.79 4 14.75 4 12.5 4 11 5.343 11 7.75v2.75H8.5v3H11V21Z" />
    </svg>
  );
}
