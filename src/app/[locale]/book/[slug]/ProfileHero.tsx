import Image from "next/image";
import { PhoneIcon, PinIcon, InstagramIcon, FacebookIcon } from "@/components/ContactIcons";
import { NavigationIcon, StarIcon } from "./ProfileIcons";

type HeroAction = { key: string; href: string; label: string; icon: React.ReactNode; external?: boolean };

/**
 * Green hero: avatar, rating, name, address and open-now line, then the
 * contact actions. Every action is built only from data the barber has
 * filled in, so a missing phone/Instagram/Facebook/address simply isn't shown.
 */
export function ProfileHero({
  name,
  photoUrl,
  rating,
  ratingLabel,
  reviewCountLabel,
  address,
  statusText,
  isOpen,
  actions,
}: {
  name: string;
  photoUrl: string | null;
  rating: number | null;
  ratingLabel: string;
  reviewCountLabel: string | null;
  address: string | null;
  statusText: string | null;
  isOpen: boolean;
  actions: HeroAction[];
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
      <div className="flex items-center gap-4 lg:gap-6">
        <div className="relative flex h-22 w-22 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-2 border-brand-gold bg-brand-green-soft lg:h-32 lg:w-32 lg:rounded-[2rem]">
          {photoUrl ? (
            <Image src={photoUrl} alt="" fill sizes="128px" priority className="object-cover" />
          ) : (
            <span aria-hidden="true" className="font-serif text-4xl font-bold text-brand-gold lg:text-5xl">
              {Array.from(name.trim())[0]?.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          {rating !== null && reviewCountLabel && (
            <div className="flex items-center gap-1.5 text-sm text-brand-cream" aria-label={ratingLabel} role="img">
              <StarIcon className="h-4 w-4 text-brand-gold" />
              <strong className="font-bold">{rating.toFixed(1)}</strong>
              <span className="text-brand-cream/75">({reviewCountLabel})</span>
            </div>
          )}
          <h1 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-brand-cream lg:text-5xl">
            {name}
          </h1>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-sm text-brand-cream/85 lg:items-end">
        {address && (
          <p className="flex items-center gap-2">
            <PinIcon className="h-4 w-4 shrink-0" />
            <span>{address}</span>
          </p>
        )}
        {statusText && (
          <p className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`mx-1 h-2 w-2 shrink-0 rounded-full ${isOpen ? "bg-[#7fd29a]" : "bg-brand-cream/50"}`}
            />
            <span>{statusText}</span>
          </p>
        )}
      </div>

      {actions.length > 0 && (
        <ul className="flex gap-2 lg:shrink-0">
          {actions.map((action) => (
            <li key={action.key} className="min-w-0 flex-1 lg:flex-none">
              <a
                href={action.href}
                {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-2xl border border-brand-cream/15 bg-brand-cream/10 px-2 py-3 text-xs font-semibold text-brand-cream transition hover:bg-brand-cream/20 lg:flex-row lg:gap-2 lg:px-4 lg:text-sm"
              >
                {action.icon}
                <span>{action.label}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const heroIcons = {
  phone: <PhoneIcon className="h-5 w-5" />,
  instagram: <InstagramIcon className="h-5 w-5" />,
  facebook: <FacebookIcon className="h-5 w-5" />,
  directions: <NavigationIcon className="h-5 w-5" />,
};
