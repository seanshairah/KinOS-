import { NextResponse, type NextRequest } from "next/server";
import { isDatabaseConfigured } from "@kinos/db";
import { attentionSweep, escalationSweep, generateBriefs, generatePatterns, healthSync, weeklyProofOfCare } from "@/lib/jobs";

export const maxDuration = 300;

/**
 * Scheduled jobs behind Vercel Cron (see vercel.json). Guarded by
 * CRON_SECRET; Vercel sends it as a bearer token automatically.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ job: string }> },
) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database not configured" }, { status: 503 });
  }

  const { job } = await params;
  try {
    switch (job) {
      case "morning-brief":
        return NextResponse.json({ ok: true, briefs: await generateBriefs("morning") });
      case "evening-brief":
        return NextResponse.json({ ok: true, briefs: await generateBriefs("evening") });
      case "attention-sweep":
        return NextResponse.json({ ok: true, subjects: await attentionSweep() });
      case "escalation-sweep":
        return NextResponse.json({ ok: true, escalated: await escalationSweep() });
      case "patterns":
        return NextResponse.json({ ok: true, patterns: await generatePatterns() });
      case "health-sync":
        return NextResponse.json({ ok: true, processed: await healthSync() });
      case "proof-of-care":
        return NextResponse.json({ ok: true, reports: await weeklyProofOfCare() });
      default:
        return NextResponse.json({ error: "unknown job" }, { status: 404 });
    }
  } catch (err) {
    console.error(`job ${job} failed`, err);
    return NextResponse.json({ error: "job failed" }, { status: 500 });
  }
}
