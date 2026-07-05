"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withUser } from "@kinos/db";
import {
  CHECK_TYPES,
  canTransitionCheck,
  inQuietMode,
  quietModeLine,
  summarizeCheckResult,
  type CheckMetricReading,
  type CheckStatus,
} from "@kinos/engine";
import { requireFamilyContext } from "../data/context";
import { logTrust } from "../data/operating";
import { notifyMember } from "../notify";
import { captureSignal } from "../pipeline";
import type { ActionResult } from "./workspace";

/**
 * Request Check actions. The flow is consent-first by construction:
 * creating a request reads nothing; only the person's own "share now"
 * turns into data. RLS decides who may ask at all.
 */

const requestSchema = z.object({
  subjectId: z.string().uuid(),
  checkType: z.enum(CHECK_TYPES),
  message: z.string().trim().max(280).optional().or(z.literal("")),
});

export async function requestCheckAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = requestSchema.safeParse({
    subjectId: formData.get("subjectId"),
    checkType: formData.get("checkType"),
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "Pick a check to ask for." };
  const { subjectId, checkType, message } = parsed.data;

  const result = await withUser(ctx.userId, async (db) => {
    const subject = await db.query(
      `select display_name, timezone, quiet_until, quiet_note from care_subject where id = $1`,
      [subjectId],
    );
    const s = subject.rows[0];
    if (!s) return { ok: false as const, message: "That orbit is out of reach." };

    // Quiet mode holds non-urgent asks. The Emergency Layer is the urgent path.
    if (inQuietMode(s.quiet_until, new Date())) {
      return {
        ok: false as const,
        message: quietModeLine(s.display_name, s.quiet_until, s.timezone, s.quiet_note),
      };
    }

    // One open ask at a time per person — calm, not a drumbeat.
    const open = await db.query(
      `select 1 from wellness_check_request
       where subject_id = $1 and status in ('pending','later') and respond_by > now()
       limit 1`,
      [subjectId],
    );
    if (open.rows[0]) {
      return {
        ok: false as const,
        message: `${s.display_name} already has a check waiting. One ask at a time.`,
      };
    }

    const inserted = await db.query(
      `insert into wellness_check_request (subject_id, requested_by, check_type, message)
       values ($1, $2, $3, $4) returning id`,
      [subjectId, ctx.member.id, checkType, message || null],
    );
    return { ok: true as const, id: inserted.rows[0]!.id, subjectName: s.display_name };
  });
  if (!result.ok) return result;

  await logTrust(ctx.userId, {
    workspaceId: ctx.workspace.id,
    actorMemberId: ctx.member.id,
    action: "requested_check",
    subjectId,
    detail: checkType,
  });

  // Tell the person at the centre, wherever they are signed in.
  const centre = await withUser(ctx.userId, async (db) => {
    const res = await db.query(
      `select id from family_member
       where workspace_id = $1 and role = 'care_recipient' and user_id is not null`,
      [ctx.workspace.id],
    );
    return res.rows as { id: string }[];
  });
  for (const m of centre) {
    await notifyMember({
      memberId: m.id,
      title: `${ctx.member.display_name ?? "Family"} is asking for a quick wellness check`,
      body: "Share now, be reminded later, or decline — it's always your choice.",
      link: "/app",
    });
  }

  revalidatePath(`/app/orbits/${subjectId}`);
  return { ok: true };
}

const respondSchema = z.object({
  requestId: z.string().uuid(),
  response: z.enum(["shared", "later", "declined"]),
  heart_rate: z.coerce.number().positive().optional().or(z.literal("")),
  systolic: z.coerce.number().positive().optional().or(z.literal("")),
  diastolic: z.coerce.number().positive().optional().or(z.literal("")),
  spo2: z.coerce.number().positive().max(100).optional().or(z.literal("")),
  temperature: z.coerce.number().positive().optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function respondCheckAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = respondSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "That response didn't read cleanly." };
  const d = parsed.data;
  const to = d.response as CheckStatus;

  const req = await withUser(ctx.userId, async (db) => {
    const res = await db.query(
      `select r.*, s.display_name as subject_name, s.workspace_id
       from wellness_check_request r join care_subject s on s.id = r.subject_id
       where r.id = $1`,
      [d.requestId],
    );
    return res.rows[0] ?? null;
  });
  if (!req) return { ok: false, message: "That request is out of reach." };
  if (!canTransitionCheck(req.status as CheckStatus, to)) {
    return { ok: false, message: "This request has already been answered." };
  }

  let signalId: string | null = null;
  if (to === "shared") {
    // Only what was typed or confirmed is shared — never a silent read.
    const readings: CheckMetricReading[] = [];
    const push = (metric: string, value: unknown) => {
      if (typeof value === "number" && Number.isFinite(value)) readings.push({ metric, value });
    };
    push("heart_rate", d.heart_rate);
    push("systolic", d.systolic);
    push("diastolic", d.diastolic);
    push("spo2", d.spo2);
    push("temperature", d.temperature);

    // Judge only against the person's own baseline, where one exists.
    await withUser(ctx.userId, async (db) => {
      for (const r of readings) {
        const b = await db.query(
          `select mean, stddev from baseline_metric
           where subject_id = $1 and metric = $2 order by updated_at desc limit 1`,
          [req.subject_id, r.metric],
        );
        if (b.rows[0]?.mean != null) {
          r.baselineMean = Number(b.rows[0].mean);
          r.baselineStddev = Number(b.rows[0].stddev ?? 0);
        }
      }
    });

    const { summary, worthACheck } = summarizeCheckResult(req.subject_name, readings);

    const captured = await captureSignal(ctx.userId, {
      subjectId: req.subject_id,
      memberId: ctx.member.id,
      signalType: "wellness_check",
      source: "request_check",
      value: {
        requestId: d.requestId,
        summary,
        worth_a_check: worthACheck,
        note: d.note || undefined,
      },
    });
    if (captured.ok && captured.signalId) signalId = captured.signalId;

    await withUser(ctx.userId, async (db) => {
      await db.query(
        `insert into wellness_check_result (request_id, subject_id, metrics, summary, worth_a_check)
         values ($1, $2, $3, $4, $5)
         on conflict (request_id) do nothing`,
        [
          d.requestId,
          req.subject_id,
          JSON.stringify(Object.fromEntries(readings.map((r) => [r.metric, r.value]))),
          summary,
          worthACheck,
        ],
      );
      if (worthACheck) {
        await db.query(
          `insert into attention_event (subject_id, kind, severity, title, detail, dedupe_key)
           values ($1, 'worth_a_check', 'attention',
                   $2, 'From a shared wellness check — follow up today. If concerned, contact a healthcare professional.',
                   $3)
           on conflict (dedupe_key) where status in ('open','ack','snoozed') do nothing`,
          [
            req.subject_id,
            `${req.subject_name}'s shared check is worth a look`,
            `check:${d.requestId}`,
          ],
        );
      }
    });
  }

  const updated = await withUser(ctx.userId, async (db) => {
    const res = await db.query(
      `update wellness_check_request
       set status = $2, responded_at = now(), result_signal_id = coalesce($3, result_signal_id)
       where id = $1 and status in ('pending','later')`,
      [d.requestId, to, signalId],
    );
    return res.rowCount ?? 0;
  });
  if (updated === 0) return { ok: false, message: "This request has already been answered." };

  await logTrust(ctx.userId, {
    workspaceId: req.workspace_id,
    actorMemberId: ctx.member.id,
    action: "responded_check",
    subjectId: req.subject_id,
    detail: to,
  });

  // The asker hears the answer — including a calm "chose not to share".
  await notifyMember({
    memberId: req.requested_by,
    title:
      to === "shared"
        ? `${req.subject_name} shared their check`
        : to === "declined"
          ? `${req.subject_name} chose not to share this check`
          : `${req.subject_name} asked to be reminded later`,
    link: `/app/orbits/${req.subject_id}`,
  });

  revalidatePath("/app");
  revalidatePath(`/app/orbits/${req.subject_id}`);
  return { ok: true };
}

export async function cancelCheckAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const requestId = z.string().uuid().parse(formData.get("requestId"));
  await withUser(ctx.userId, async (db) => {
    await db.query(
      `update wellness_check_request set status = 'cancelled', responded_at = now()
       where id = $1 and status in ('pending','later')`,
      [requestId],
    );
  });
  revalidatePath("/app");
  return { ok: true };
}
