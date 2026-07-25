import { NextRequest, NextResponse } from "next/server";
import { processQueuedNotifications } from "@/lib/notifications/process";

// Cron-triggered entry point (see vercel.json) that drains the
// notifications_log queue: sends anything due (queued confirmations,
// due reminders) and retries anything previously failed with attempts
// remaining (08_Roadmap.md Phase 6 "retry logic"). This is the only path
// that actually delivers a reminder — those are scheduled hours ahead of
// time, so nothing in the request/response cycle that created the
// appointment can send them itself (see src/lib/notifications/queue.ts).
//
// GET because that's what Vercel Cron invokes; POST too so it can be
// triggered manually (e.g. `curl -X POST .../api/notifications/process`)
// for local testing without waiting on a schedule.
async function handleProcessRequest(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const result = await processQueuedNotifications();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return handleProcessRequest(request);
}

export async function POST(request: NextRequest) {
  return handleProcessRequest(request);
}
