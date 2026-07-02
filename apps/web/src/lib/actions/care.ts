"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { requireFamilyContext } from "../data/context";
import { notifyMember } from "../notify";
import { recordActivation, runDecideStage } from "../pipeline";
import type { ActionResult } from "./workspace";

const dutySchema = z.object({
  subjectId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  ownerMemberId: z.string().uuid().optional().or(z.literal("")),
  dueAt: z.string().optional().or(z.literal("")),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  repeat: z.enum(["none", "day", "week", "month"]).default("none"),
});

export async function createDutyAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = dutySchema.safeParse({
    subjectId: formData.get("subjectId"),
    title: formData.get("title"),
    ownerMemberId: formData.get("ownerMemberId") ?? "",
    dueAt: formData.get("dueAt") ?? "",
    priority: formData.get("priority") ?? "normal",
    repeat: formData.get("repeat") ?? "none",
  });
  if (!parsed.success) return { ok: false, message: "A duty needs at least a name." };

  await withUser(ctx.userId, async (db) => {
    await db.query(
      `insert into duty (subject_id, title, owner_member_id, due_at, priority, recurrence, created_by)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        parsed.data.subjectId,
        parsed.data.title,
        parsed.data.ownerMemberId || null,
        parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null,
        parsed.data.priority,
        parsed.data.repeat === "none" ? null : JSON.stringify({ every: parsed.data.repeat }),
        ctx.member.id,
      ],
    );
  });
  await recordActivation(parsed.data.subjectId, "first_duty");

  if (parsed.data.ownerMemberId && parsed.data.ownerMemberId !== ctx.member.id) {
    await notifyMember({
      memberId: parsed.data.ownerMemberId,
      title: `New duty: ${parsed.data.title}`,
      link: "/app/duties",
    });
  }

  revalidatePath("/app/duties");
  revalidatePath(`/app/orbits/${parsed.data.subjectId}`);
  return { ok: true };
}

export async function completeDutyAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const dutyId = z.string().uuid().parse(formData.get("dutyId"));

  await withUser(ctx.userId, async (db) => {
    const res = await db.query(
      `update duty set status = 'done', completed_at = now() where id = $1
       returning subject_id, title, owner_member_id, due_at, priority, recurrence, created_by`,
      [dutyId],
    );
    const duty = res.rows[0];
    if (duty) {
      await db.query(
        `update attention_event set status = 'resolved', resolved_at = now()
         where dedupe_key = $1 and status in ('open','ack')`,
        [`duty_overdue:${dutyId}`],
      );

      // A rhythm, not a one-off: roll the next occurrence forward.
      const every = (duty.recurrence as { every?: string } | null)?.every;
      if (every === "day" || every === "week" || every === "month") {
        const base = duty.due_at ? new Date(duty.due_at) : new Date();
        const next = new Date(base);
        if (every === "day") next.setDate(next.getDate() + 1);
        if (every === "week") next.setDate(next.getDate() + 7);
        if (every === "month") next.setMonth(next.getMonth() + 1);
        // Never schedule into the past after a late completion.
        while (next.getTime() < Date.now()) {
          if (every === "day") next.setDate(next.getDate() + 1);
          else if (every === "week") next.setDate(next.getDate() + 7);
          else next.setMonth(next.getMonth() + 1);
        }
        await db.query(
          `insert into duty (subject_id, title, owner_member_id, due_at, priority, recurrence, created_by)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [
            duty.subject_id,
            duty.title,
            duty.owner_member_id,
            next.toISOString(),
            duty.priority,
            JSON.stringify({ every }),
            duty.created_by,
          ],
        );
      }
    }
  });

  revalidatePath("/app/duties");
  revalidatePath("/app");
  return { ok: true };
}

const medicationSchema = z.object({
  subjectId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  dose: z.string().max(60).optional().or(z.literal("")),
  times: z.string().max(120),
  refillAt: z.string().optional().or(z.literal("")),
});

export async function addMedicationAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = medicationSchema.safeParse({
    subjectId: formData.get("subjectId"),
    name: formData.get("name"),
    dose: formData.get("dose") ?? "",
    times: formData.get("times") ?? "",
    refillAt: formData.get("refillAt") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "A medication needs a name." };

  const times = parsed.data.times
    .split(",")
    .map((t) => t.trim())
    .filter((t) => /^\d{2}:\d{2}$/.test(t));

  await withUser(ctx.userId, async (db) => {
    await db.query(
      `insert into medication (subject_id, name, dose, schedule, refill_at)
       values ($1, $2, $3, $4, $5)`,
      [
        parsed.data.subjectId,
        parsed.data.name,
        parsed.data.dose || null,
        JSON.stringify({ times }),
        parsed.data.refillAt || null,
      ],
    );
  });

  revalidatePath(`/app/orbits/${parsed.data.subjectId}`);
  return { ok: true };
}

const appointmentSchema = z.object({
  subjectId: z.string().uuid(),
  kind: z.enum(["clinic", "school", "transport", "family_call", "refill", "other"]),
  title: z.string().trim().min(2).max(160),
  location: z.string().max(160).optional().or(z.literal("")),
  startsAt: z.string().min(4),
  transportOwnerMemberId: z.string().uuid().optional().or(z.literal("")),
});

export async function addAppointmentAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = appointmentSchema.safeParse({
    subjectId: formData.get("subjectId"),
    kind: formData.get("kind") ?? "clinic",
    title: formData.get("title"),
    location: formData.get("location") ?? "",
    startsAt: formData.get("startsAt"),
    transportOwnerMemberId: formData.get("transportOwnerMemberId") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "An appointment needs a name and a time." };

  await withUser(ctx.userId, async (db) => {
    await db.query(
      `insert into appointment (subject_id, kind, title, location, starts_at, transport_owner_member_id)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        parsed.data.subjectId,
        parsed.data.kind,
        parsed.data.title,
        parsed.data.location || null,
        new Date(parsed.data.startsAt).toISOString(),
        parsed.data.transportOwnerMemberId || null,
      ],
    );
  });

  await runDecideStage(parsed.data.subjectId);
  revalidatePath(`/app/orbits/${parsed.data.subjectId}`);
  return { ok: true };
}

export async function confirmTransportAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const appointmentId = z.string().uuid().parse(formData.get("appointmentId"));

  await withUser(ctx.userId, async (db) => {
    await db.query(
      `update appointment set transport_confirmed = true,
         transport_owner_member_id = coalesce(transport_owner_member_id, $2)
       where id = $1`,
      [appointmentId, ctx.member.id],
    );
    await db.query(
      `update attention_event set status = 'resolved', resolved_at = now()
       where dedupe_key = $1 and status in ('open','ack')`,
      [`transport_unconfirmed:${appointmentId}`],
    );
  });

  revalidatePath("/app");
  revalidatePath("/app/attention");
  return { ok: true };
}

export async function resolveAttentionAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const eventId = z.string().uuid().parse(formData.get("eventId"));
  const mode = z.enum(["resolved", "ack", "snoozed"]).parse(formData.get("mode") ?? "resolved");

  await withUser(ctx.userId, async (db) => {
    await db.query(
      mode === "resolved"
        ? `update attention_event set status = 'resolved', resolved_at = now() where id = $1`
        : mode === "snoozed"
          ? `update attention_event set status = 'snoozed', escalate_at = now() + interval '12 hours' where id = $1`
          : `update attention_event set status = 'ack' where id = $1`,
      [eventId],
    );
  });

  revalidatePath("/app/attention");
  revalidatePath("/app");
  return { ok: true };
}

export async function nudgeMemberAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const memberId = z.string().uuid().parse(formData.get("memberId"));
  const about = z.string().max(200).parse(formData.get("about") ?? "something that needs attention");

  await notifyMember({
    memberId,
    title: `${ctx.member.display_name ?? "A family member"} sent a gentle nudge`,
    body: about,
    link: "/app/attention",
    priority: "high",
  });
  return { ok: true, message: "Nudge sent." };
}
