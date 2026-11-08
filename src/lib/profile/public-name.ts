/**
 * New accounts are created with an empty `displayName` (the specialist picks
 * their own on the profile page). Every place that shows the name must go
 * through these helpers so an unnamed account never renders blank text, and
 * so the public booking page stays hidden until a name exists.
 */

/** True once the specialist has saved a real display name. */
export function hasDisplayName(displayName: string | null | undefined): displayName is string {
  return !!displayName && displayName.trim().length > 0;
}

/** The display name, or `fallback` while the profile is still unnamed. */
export function displayNameOrFallback(displayName: string | null | undefined, fallback: string): string {
  return hasDisplayName(displayName) ? displayName.trim() : fallback;
}

/**
 * Brand-neutral stand-in used where a name has to sit inside a sentence that
 * is inflected per language (emails: "appointment with X", "у X", "X-ի մոտ"),
 * so a descriptive fallback like "your specialist" would be ungrammatical.
 */
export const EMAIL_NAME_FALLBACK = "On-Time";
