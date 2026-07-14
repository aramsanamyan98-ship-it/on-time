import type { FieldErrors } from "@/lib/dashboard/errors";

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;
const MAX_DURATION_MINUTES = 24 * 60;

export type ServiceFields = "name" | "durationMinutes" | "priceAmd" | "description";

export type ServiceInput = {
  name: string;
  durationMinutes: string;
  priceAmd: string;
  description: string;
};

export type ParsedService = {
  name: string;
  durationMinutes: number;
  priceAmd: number;
  description: string | null;
};

export function validateService(input: ServiceInput): {
  fieldErrors: FieldErrors<ServiceFields>;
  data?: ParsedService;
} {
  const fieldErrors: FieldErrors<ServiceFields> = {};

  const name = input.name.trim();
  if (!name) fieldErrors.name = "nameRequired";
  else if (name.length > NAME_MAX_LENGTH) fieldErrors.name = "nameTooLong";

  const durationRaw = input.durationMinutes.trim();
  const duration = Number(durationRaw);
  if (!durationRaw) fieldErrors.durationMinutes = "durationRequired";
  else if (!Number.isInteger(duration) || duration <= 0 || duration > MAX_DURATION_MINUTES) {
    fieldErrors.durationMinutes = "durationInvalid";
  }

  const priceRaw = input.priceAmd.trim();
  const price = Number(priceRaw);
  if (!priceRaw) fieldErrors.priceAmd = "priceRequired";
  else if (!Number.isInteger(price) || price < 0) fieldErrors.priceAmd = "priceInvalid";

  const description = input.description.trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) fieldErrors.description = "descriptionTooLong";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  return {
    fieldErrors: {},
    data: { name, durationMinutes: duration, priceAmd: price, description: description || null },
  };
}
