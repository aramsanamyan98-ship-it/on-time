import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Each warm Vercel serverless instance keeps this module (and the pool
// below) alive across the requests it handles, but a burst of traffic
// spins up many instances at once, each with its own pool. DATABASE_URL
// must point at Supabase's Supavisor *transaction* pooler (port 6543), not
// the direct connection (port 5432) — that's what lets many short-lived
// serverless connections share a small number of real Postgres backend
// connections. On top of that, keep each instance's own pool small:
// Supavisor's own client-connection limit is also finite per compute tier,
// so a high per-instance `max` multiplied across N concurrent instances is
// exactly what exhausts it ("max clients reached").
const POOL_MAX = Number(process.env.DATABASE_POOL_MAX ?? 3);

function createPrismaClient() {
  const adapter = new PrismaPg(
    {
      connectionString: process.env.DATABASE_URL,
      max: POOL_MAX,
      idleTimeoutMillis: 10_000,
      // Fail fast instead of hanging the request (and burning function
      // execution time) if the pooler is saturated.
      connectionTimeoutMillis: 5_000,
    },
    {
      // Supavisor's transaction mode doesn't support named/cached prepared
      // statements — a statement prepared on one pooled backend connection
      // may not exist on whichever backend serves the next query. Leaving
      // `statementNameGenerator` unset (the default) keeps every prepared
      // statement unnamed, which is what makes this adapter safe to use
      // through the transaction pooler in the first place.
      onPoolError: (err) => {
        console.error("Postgres pool error:", err);
      },
    },
  );
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
