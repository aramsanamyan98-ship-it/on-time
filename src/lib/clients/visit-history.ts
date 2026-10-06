import { prisma } from "@/lib/prisma";

const MS_PER_DAY = 86_400_000;

/** Lost-clients grace period (docs/08_Roadmap.md): how many days past a
 * predicted next-visit date a client has to actually rebook before counting
 * as "lost" rather than merely "due". */
export const LOST_CLIENT_GRACE_DAYS = 7;

export type ClientVisitHistory = {
  guestPhone: string;
  /** Completed-booking visit dates only, ascending. */
  visitDates: Date[];
  visitCount: number;
  firstVisit: Date;
  lastVisit: Date;
  /** Mean gap in days between consecutive visits; null with fewer than 2 visits. */
  averageGapDays: number | null;
  /** lastVisit + averageGapDays; null whenever averageGapDays is null. */
  predictedNextVisit: Date | null;
};

/**
 * Shared visit-history layer for the client-analytics cluster (loyalty
 * streaks, return-rate analytics, next-visit prediction, lost-clients list —
 * see docs/08_Roadmap.md). Scoped to `completed` bookings only, since this
 * answers "when did this client actually show up", not "when did they book"
 * (that broader, any-status question is answered separately by
 * src/lib/dashboard/clients.ts and src/lib/analytics/queries.ts, which have
 * their own, already-shipped semantics this cluster doesn't change).
 *
 * Grouped by `guestPhone`, which is normalized to E.164 at write time (see
 * src/lib/phone.ts) — the only identity key appointments have for a client.
 */
export async function getVisitHistoryMap(specialistId: string): Promise<Map<string, ClientVisitHistory>> {
  const appointments = await prisma.appointment.findMany({
    where: { specialistId, status: "completed" },
    select: { guestPhone: true, startAt: true },
    orderBy: { startAt: "asc" },
  });

  const visitsByPhone = new Map<string, Date[]>();
  for (const appointment of appointments) {
    const dates = visitsByPhone.get(appointment.guestPhone);
    if (dates) dates.push(appointment.startAt);
    else visitsByPhone.set(appointment.guestPhone, [appointment.startAt]);
  }

  const result = new Map<string, ClientVisitHistory>();
  for (const [guestPhone, visitDates] of visitsByPhone) {
    result.set(guestPhone, buildHistory(guestPhone, visitDates));
  }
  return result;
}

export async function getVisitHistoryForClient(
  specialistId: string,
  guestPhone: string,
): Promise<ClientVisitHistory | null> {
  const map = await getVisitHistoryMap(specialistId);
  return map.get(guestPhone) ?? null;
}

/** True once `now` is more than LOST_CLIENT_GRACE_DAYS past the predicted next visit. */
export function isLostClient(history: ClientVisitHistory, now: Date = new Date()): boolean {
  if (!history.predictedNextVisit) return false;
  const graceDeadline = history.predictedNextVisit.getTime() + LOST_CLIENT_GRACE_DAYS * MS_PER_DAY;
  return now.getTime() > graceDeadline;
}

function buildHistory(guestPhone: string, visitDates: Date[]): ClientVisitHistory {
  const firstVisit = visitDates[0];
  const lastVisit = visitDates[visitDates.length - 1];

  let averageGapDays: number | null = null;
  if (visitDates.length >= 2) {
    const totalGapDays = (lastVisit.getTime() - firstVisit.getTime()) / MS_PER_DAY;
    averageGapDays = totalGapDays / (visitDates.length - 1);
  }

  const predictedNextVisit =
    averageGapDays === null ? null : new Date(lastVisit.getTime() + averageGapDays * MS_PER_DAY);

  return {
    guestPhone,
    visitDates,
    visitCount: visitDates.length,
    firstVisit,
    lastVisit,
    averageGapDays,
    predictedNextVisit,
  };
}
