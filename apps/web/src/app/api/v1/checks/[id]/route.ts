import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@kinos/db";
import {
  canTransitionCheck,
  summarizeCheckResult,
  type CheckMetricReading,
  type CheckStatus,
} from "@kinos/engine";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { getFamilyContext } from "@/lib/data/context";
import { logTrust } from "@/lib/data/operating";
import { notifyMember } from "@/lib/notify";
import { captureSignal } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

const respondSchema = z.object({
  response: z.enum(["shared", "later", "declined"]),
  metrics: z
    .object({
      heart_rate: z.number().positive().optional(),
      systolic: z.number().positive().optional(),
      diastolic: z.number().positive().optional(),
      spo2: z.number().positive().max(100).optional(),
      temperature: z.number().positive().optional(),
      steps: z.number().nonnegative().optional(),
      sleep_minutes: z.number().nonnegative().optional(),
    })
    .optional(),
  note: z.string().trim().max(500).optional(),
});

/**
 * The person at the centre answers a Request Check from their phone:
 * share now (optionally with readings their device offered), remind me
 * later, or decline. A decline is a complete answer — it creates a calm
 * status, never an alarm.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const ctx = await getFamilyContext(userId);
    if (!ctx) return NextResponse.json({ error: "join a family space first" }, { status: 403 });

    const { id } = await params;
    const requestId = z.string().uuid().safeParse(id);
    const parsed = respondSchema.safeParse(await req.json().catch(() => ({})));
    if (!requestId.success || !parsed.success) {
      return NextResponse.json({ error: "that response didn't read cleanly" }, { status: 400 });
    }
    const to = parsed.data.response as CheckStatus;

    const request = await withUser(userId, async (db) => {
      const res = await db.query(
        `select r.*, s.display_name as subject_name, s.workspace_id
         from wellness_check_request r join care_subject s on s.id = r.subject_id
         where r.id = $1`,
        [requestId.data],
      );
      return res.rows[0] ?? null;
    });
    if (!request) return NextResponse.json({ error: "request not found" }, { status: 404 });
    if (!canTransitionCheck(request.status as CheckStatus, to)) {
      return NextResponse.json({ error: "already answered" }, { status: 409 });
    }

    let signalId: string | null = null;
    let summaryOut: string | null = null;
    if (to === "shared") {
      const readings: CheckMetricReading[] = Object.entries(parsed.data.metrics ?? {})
        .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
        .map(([metric, value]) => ({ metric, value: value as number }));

      await withUser(userId, async (db) => {
        for (const r of readings) {
          const b = await db.query(
            `select mean, stddev from baseline_metric
             where subject_id = $1 and metric = $2 order by updated_at desc limit 1`,
            [request.subject_id, r.metric],
          );
          if (b.rows[0]?.mean != null) {
            r.baselineMean = Number(b.rows[0].mean);
            r.baselineStddev = Number(b.rows[0].stddev ?? 0);
          }
        }
      });
      const { summary, worthACheck } = summarizeCheckResult(request.subject_name, readings);
      summaryOut = summary;

      const captured = await captureSignal(userId, {
        subjectId: request.subject_id,
        memberId: ctx.member.id,
        signalType: "wellness_check",
        source: "request_check",
        value: {
          requestId: requestId.data,
          summary,
          worth_a_check: worthACheck,
          note: parsed.data.note,
        },
      });
      if (captured.ok && captured.signalId) signalId = captured.signalId;

      await withUser(userId, async (db) => {
        await db.query(
          `insert into wellness_check_result (request_id, subject_id, metrics, summary, worth_a_check)
           values ($1, $2, $3, $4, $5)
           on conflict (request_id) do nothing`,
          [
            requestId.data,
            request.subject_id,
            JSON.stringify(Object.fromEntries(readings.map((r) => [r.metric, r.value]))),
            summary,
            worthACheck,
          ],
        );
        if (worthACheck) {
          await db.query(
            `insert into attention_event (subject_id, kind, severity, title, detail, dedupe_key)
             values ($1, 'worth_a_check', 'attention', $2,
                     'From a shared wellness check — follow up today. If concerned, contact a healthcare professional.',
                     $3)
             on conflict (dedupe_key) where status in ('open','ack','snoozed') do nothing`,
            [
              request.subject_id,
              `${request.subject_name}'s shared check is worth a look`,
              `check:${requestId.data}`,
            ],
          );
        }
      });
    }

    const updated = await withUser(userId, async (db) => {
      const res = await db.query(
        `update wellness_check_request
         set status = $2, responded_at = now(), result_signal_id = coalesce($3, result_signal_id)
         where id = $1 and status in ('pending','later')`,
        [requestId.data, to, signalId],
      );
      return res.rowCount ?? 0;
    });
    if (updated === 0) return NextResponse.json({ error: "already answered" }, { status: 409 });

    await logTrust(userId, {
      workspaceId: request.workspace_id,
      actorMemberId: ctx.member.id,
      action: "responded_check",
      subjectId: request.subject_id,
      detail: to,
    });
    await notifyMember({
      memberId: request.requested_by,
      title:
        to === "shared"
          ? `${request.subject_name} shared their check`
          : to === "declined"
            ? `${request.subject_name} chose not to share this check`
            : `${request.subject_name} asked to be reminded later`,
      link: `/app/orbits/${request.subject_id}`,
    });

    return NextResponse.json({ ok: true, summary: summaryOut });
  } catch (err) {
    return serverError(err);
  }
}
