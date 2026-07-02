import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { getFamilyContext } from "@/lib/data/context";
import { ingestHealthReadings } from "@/lib/health";

export const dynamic = "force-dynamic";

/**
 * Health readings in — from a manual entry, or the mobile app relaying
 * Apple Health / Health Connect. Postgres enforces who may write for whom;
 * the reducer decides, calmly, whether anything is worth saying.
 */

const readingSchema = z.object({
  metric: z.enum([
    "blood_pressure",
    "heart_rate",
    "sleep_minutes",
    "steps",
    "weight",
    "glucose",
    "spo2",
  ]),
  value: z.record(z.number()),
  unit: z.string().max(24).optional(),
  takenAt: z.string().datetime().optional(),
  externalId: z.string().max(128).optional(),
  device: z.record(z.unknown()).optional(),
});

const schema = z.object({
  subjectId: z.string().uuid(),
  source: z.enum(["manual", "apple_health", "health_connect"]).default("manual"),
  readings: z.array(readingSchema).min(1).max(100),
});

export async function POST(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const ctx = await getFamilyContext(userId);
    if (!ctx) return NextResponse.json({ error: "join a family space first" }, { status: 403 });

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "readings didn't look right" }, { status: 400 });
    }

    const result = await ingestHealthReadings(userId, {
      subjectId: parsed.data.subjectId,
      memberId: ctx.member.id,
      source: parsed.data.source,
      readings: parsed.data.readings,
    });
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
    return NextResponse.json({
      ok: true,
      stored: result.stored,
      observations: result.observations,
      attentionRaised: result.attentionRaised,
    });
  } catch (err) {
    return serverError(err);
  }
}
