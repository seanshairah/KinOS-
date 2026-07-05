"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { CONNECTOR_CAPABILITIES, type ConnectorProvider } from "@kinos/engine";
import { requireFamilyContext } from "../data/context";
import { buildHandoverBody, logTrust } from "../data/operating";
import { notifyMember } from "../notify";
import { captureSignal } from "../pipeline";
import type { ActionResult } from "./workspace";

/**
 * Operating-layer actions: the care plan, quiet mode, handovers and the
 * device registry. Writes go through RLS; the trust log keeps each
 * sensitive change visible to the whole family.
 */

// ---------- care plan ----------

const carePlanSchema = z.object({
  subjectId: z.string().uuid(),
  dailyRoutine: z.string().trim().max(2000).optional().or(z.literal("")),
  dietaryNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  mobilityNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  emergencyInstructions: z.string().trim().max(2000).optional().or(z.literal("")),
  preferredPharmacy: z.string().trim().max(200).optional().or(z.literal("")),
  doctorName: z.string().trim().max(200).optional().or(z.literal("")),
  doctorPhone: z.string().trim().max(40).optional().or(z.literal("")),
  familyRules: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function saveCarePlanAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = carePlanSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "The plan didn't read cleanly." };
  const d = parsed.data;

  await withUser(ctx.userId, async (db) => {
    await db.query(
      `insert into care_plan
         (subject_id, daily_routine, dietary_notes, mobility_notes, emergency_instructions,
          preferred_pharmacy, doctor_name, doctor_phone, family_rules, updated_by, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
       on conflict (subject_id) do update set
         daily_routine = excluded.daily_routine,
         dietary_notes = excluded.dietary_notes,
         mobility_notes = excluded.mobility_notes,
         emergency_instructions = excluded.emergency_instructions,
         preferred_pharmacy = excluded.preferred_pharmacy,
         doctor_name = excluded.doctor_name,
         doctor_phone = excluded.doctor_phone,
         family_rules = excluded.family_rules,
         updated_by = excluded.updated_by,
         updated_at = now()`,
      [
        d.subjectId,
        d.dailyRoutine || null,
        d.dietaryNotes || null,
        d.mobilityNotes || null,
        d.emergencyInstructions || null,
        d.preferredPharmacy || null,
        d.doctorName || null,
        d.doctorPhone || null,
        d.familyRules || null,
        ctx.member.id,
      ],
    );
  });

  revalidatePath(`/app/orbits/${d.subjectId}`);
  revalidatePath("/app/care");
  return { ok: true };
}

// ---------- quiet mode ----------

const quietSchema = z.object({
  subjectId: z.string().uuid(),
  hours: z.coerce.number().min(0).max(24),
  note: z.string().trim().max(160).optional().or(z.literal("")),
});

export async function setQuietModeAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = quietSchema.safeParse({
    subjectId: formData.get("subjectId"),
    hours: formData.get("hours"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "Pick how long the rest should hold." };
  const { subjectId, hours, note } = parsed.data;

  await withUser(ctx.userId, async (db) => {
    if (hours === 0) {
      await db.query(
        `update care_subject set quiet_until = null, quiet_note = null where id = $1`,
        [subjectId],
      );
    } else {
      await db.query(
        `update care_subject
         set quiet_until = now() + make_interval(hours => $2), quiet_note = $3
         where id = $1`,
        [subjectId, hours, note || null],
      );
    }
  });

  await logTrust(ctx.userId, {
    workspaceId: ctx.workspace.id,
    actorMemberId: ctx.member.id,
    action: "changed_quiet_mode",
    subjectId,
    detail: hours === 0 ? "resumed" : `resting ${hours}h`,
  });

  revalidatePath(`/app/orbits/${subjectId}`);
  revalidatePath("/app");
  return { ok: true };
}

// ---------- handover ----------

const handoverSchema = z.object({
  subjectId: z.string().uuid(),
  toMemberId: z.string().uuid().optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function createHandoverAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = handoverSchema.safeParse({
    subjectId: formData.get("subjectId"),
    toMemberId: formData.get("toMemberId") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "The handover needs an orbit." };
  const { subjectId, toMemberId, note } = parsed.data;

  const toName = toMemberId
    ? await withUser(ctx.userId, async (db) => {
        const r = await db.query(`select display_name from family_member where id = $1`, [
          toMemberId,
        ]);
        return (r.rows[0]?.display_name as string | undefined) ?? null;
      })
    : null;

  // The body is composed from today's real state — one honest page.
  const body = await buildHandoverBody(
    ctx.userId,
    subjectId,
    ctx.member.display_name ?? "A family member",
    toName,
  );

  await withUser(ctx.userId, async (db) => {
    await db.query(
      `insert into family_handover (subject_id, from_member_id, to_member_id, body, note)
       values ($1, $2, $3, $4, $5)`,
      [subjectId, ctx.member.id, toMemberId || null, body, note || null],
    );
  });

  if (toMemberId && toMemberId !== ctx.member.id) {
    await notifyMember({
      memberId: toMemberId,
      title: `${ctx.member.display_name ?? "Someone"} handed the day over to you`,
      body: "The handover is in the Family Record — what happened, what's open, what's worth an eye.",
      link: "/app/record",
    });
  }

  revalidatePath("/app/record");
  revalidatePath(`/app/orbits/${subjectId}`);
  return { ok: true };
}

export async function acknowledgeHandoverAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const handoverId = z.string().uuid().parse(formData.get("handoverId"));
  await withUser(ctx.userId, async (db) => {
    await db.query(
      `update family_handover set status = 'acknowledged', acknowledged_at = now()
       where id = $1 and status = 'open'`,
      [handoverId],
    );
  });
  revalidatePath("/app/record");
  return { ok: true };
}

// ---------- device registry ----------

const PROVIDERS = [
  "apple_health",
  "health_connect",
  "samsung_health",
  "bluetooth_device",
] as const;

const deviceSchema = z.object({
  subjectId: z.string().uuid(),
  provider: z.enum(PROVIDERS),
});

/**
 * Register how readings arrive for this person. Phone stores sync through
 * the mobile app; this records the connection and its honest capabilities
 * so Request Check only offers what can actually be served.
 */
export async function connectDeviceAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = deviceSchema.safeParse({
    subjectId: formData.get("subjectId"),
    provider: formData.get("provider"),
  });
  if (!parsed.success) return { ok: false, message: "Pick a source to connect." };
  const { subjectId, provider } = parsed.data;
  const caps = CONNECTOR_CAPABILITIES[provider as ConnectorProvider];

  await withUser(ctx.userId, async (db) => {
    await db.query(
      `insert into device_connection (subject_id, provider, capabilities, permission_status)
       values ($1, $2, $3, 'pending')
       on conflict (subject_id, provider) do update
         set status = 'active', permission_status = 'pending'`,
      [subjectId, provider, JSON.stringify(caps)],
    );
  });

  revalidatePath(`/app/orbits/${subjectId}`);
  return { ok: true };
}

export async function disconnectDeviceAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const connectionId = z.string().uuid().parse(formData.get("connectionId"));
  const subjectId = z.string().uuid().parse(formData.get("subjectId"));
  await withUser(ctx.userId, async (db) => {
    await db.query(
      `update device_connection set status = 'disconnected', permission_status = 'revoked'
       where id = $1`,
      [connectionId],
    );
  });
  revalidatePath(`/app/orbits/${subjectId}`);
  return { ok: true };
}

// ---------- caregiver visits ----------

export async function startVisitAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const subjectId = z.string().uuid().parse(formData.get("subjectId"));
  await withUser(ctx.userId, async (db) => {
    const open = await db.query(
      `select 1 from caregiver_visit
       where subject_id = $1 and caregiver_member_id = $2
         and check_in is not null and check_out is null limit 1`,
      [subjectId, ctx.member.id],
    );
    if (open.rows[0]) return; // already inside — starting twice is a no-op
    await db.query(
      `insert into caregiver_visit (subject_id, caregiver_member_id, check_in)
       values ($1, $2, now())`,
      [subjectId, ctx.member.id],
    );
  });
  revalidatePath("/app/care");
  return { ok: true };
}

const endVisitSchema = z.object({
  subjectId: z.string().uuid(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function endVisitAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = endVisitSchema.safeParse({
    subjectId: formData.get("subjectId"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "That didn't read cleanly." };
  const { subjectId, notes } = parsed.data;

  const closed = await withUser(ctx.userId, async (db) => {
    const res = await db.query(
      `update caregiver_visit set check_out = now(), notes = coalesce(nullif($3, ''), notes)
       where subject_id = $1 and caregiver_member_id = $2
         and check_in is not null and check_out is null`,
      [subjectId, ctx.member.id, notes ?? ""],
    );
    return res.rowCount ?? 0;
  });
  if (closed === 0) return { ok: false, message: "No visit is open right now." };

  // The visit becomes a Life Signal — the family simply sees care happened.
  await captureSignal(ctx.userId, {
    subjectId,
    memberId: ctx.member.id,
    signalType: "caregiver_visit",
    source: "system",
    value: { note: notes || undefined },
  });

  revalidatePath("/app/care");
  return { ok: true };
}

// ---------- raise attention (a caregiver's word counts) ----------

const raiseSchema = z.object({
  subjectId: z.string().uuid(),
  title: z.string().trim().min(3).max(160),
  detail: z.string().trim().max(600).optional().or(z.literal("")),
});

export async function raiseAttentionAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = raiseSchema.safeParse({
    subjectId: formData.get("subjectId"),
    title: formData.get("title"),
    detail: formData.get("detail") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "Say what needs the family's eyes." };
  const { subjectId, title, detail } = parsed.data;

  await withUser(ctx.userId, async (db) => {
    await db.query(
      `insert into attention_event (subject_id, kind, severity, title, detail)
       values ($1, 'worth_a_check', 'attention', $2, $3)`,
      [subjectId, title, detail || null],
    );
  });
  revalidatePath("/app/care");
  revalidatePath("/app/attention");
  return { ok: true };
}
