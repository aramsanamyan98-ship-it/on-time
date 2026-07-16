/**
 * Detects whether an error thrown from an `appointments` insert/update came
 * from the `appointments_no_overlap` EXCLUDE constraint (see
 * prisma/migrations) — i.e. someone else booked/moved into the same slot
 * first. With the `@prisma/adapter-pg` driver adapter this surfaces as a
 * `DriverAdapterError` whose `.cause` carries the raw Postgres error, with
 * `.cause.code` set to the SQLSTATE ("23P01" = exclusion_violation);
 * checked against multiple plausible shapes since this isn't a Prisma-
 * recognized constraint (Prisma only special-cases its own unique
 * constraints, code "23505", as P2002).
 */
export function isSlotConflictError(err: unknown): boolean {
  const anyErr = err as { cause?: { code?: string; originalCode?: string }; code?: string; message?: string };
  const code = anyErr?.cause?.code ?? anyErr?.cause?.originalCode ?? anyErr?.code;
  if (code === "23P01" || code === "23505") return true;

  const message = String(anyErr?.message ?? "");
  return message.includes("appointments_no_overlap") || message.includes("exclusion constraint");
}
