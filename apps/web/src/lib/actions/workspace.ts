"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withUser, withService } from "@kinos/db";
import { PLANS, orbitCap, type PlanId } from "@kinos/config";
import { requireFamilyContext, requireUserId } from "../data/context";

const nameSchema = z.string().trim().min(1).max(80);

export interface ActionResult {
  ok: boolean;
  message?: string;
  id?: string;
}

export async function createWorkspaceAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = z
    .object({ familyName: nameSchema, yourName: nameSchema })
    .safeParse({
      familyName: formData.get("familyName"),
      yourName: formData.get("yourName"),
    });
  if (!parsed.success) redirect("/app/onboarding?error=names");

  await withUser(userId, async (db) => {
    await db.query(`select create_workspace($1, $2)`, [
      parsed.data.familyName,
      parsed.data.yourName,
    ]);
  });
  redirect("/app/onboarding");
}

const orbitSchema = z.object({
  displayName: nameSchema,
  kind: z.enum(["elder", "child", "recovery", "disability", "self"]),
  timezone: z.string().min(1).max(64).default("Africa/Harare"),
  expectedCheckinBy: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .or(z.literal("")),
});

export async function createOrbitAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = orbitSchema.safeParse({
    displayName: formData.get("displayName"),
    kind: formData.get("kind"),
    timezone: formData.get("timezone") || "Africa/Harare",
    expectedCheckinBy: formData.get("expectedCheckinBy") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: "Give this Orbit a name and a kind." };
  }

  // Plan gating: Orbits per plan.
  const planId = (ctx.workspace.plan_id in PLANS ? ctx.workspace.plan_id : "free") as PlanId;
  const existing = await withUser(ctx.userId, async (db) => {
    const res = await db.query(`select count(*)::int as n from care_subject`);
    return res.rows[0]?.n ?? 0;
  });
  if (existing >= orbitCap(planId)) {
    return {
      ok: false,
      message: `The ${PLANS[planId].name} plan holds ${orbitCap(planId)} Orbit${orbitCap(planId) === 1 ? "" : "s"}. Upgrade to add another loved one.`,
    };
  }

  const id = await withUser(ctx.userId, async (db) => {
    const res = await db.query(
      `insert into care_subject (workspace_id, display_name, kind, timezone, expected_checkin_by)
       values ($1, $2, $3, $4, $5) returning id`,
      [
        ctx.workspace.id,
        parsed.data.displayName,
        parsed.data.kind,
        parsed.data.timezone,
        parsed.data.expectedCheckinBy || null,
      ],
    );
    await db.query(
      `insert into activation_event (workspace_id, step) values ($1, 'orbit_created')
       on conflict do nothing`,
      [ctx.workspace.id],
    );
    return res.rows[0]!.id as string;
  });

  revalidatePath("/app");
  return { ok: true, id };
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "caregiver", "care_recipient", "viewer", "emergency"]),
  scopes: z.array(z.enum(["health", "money", "documents", "location", "full"])),
});

export async function inviteMemberAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    scopes: formData.getAll("scopes"),
  });
  if (!parsed.success) return { ok: false, message: "Check the email address and role." };

  const token = await withUser(ctx.userId, async (db) => {
    const res = await db.query(
      `insert into invitation (workspace_id, email, role, scopes, invited_by)
       values ($1, $2, $3, $4, $5) returning token`,
      [ctx.workspace.id, parsed.data.email, parsed.data.role, parsed.data.scopes, ctx.member.id],
    );
    await db.query(
      `insert into access_log (workspace_id, actor_member_id, action, target)
       values ($1, $2, 'invited_member', $3)`,
      [ctx.workspace.id, ctx.member.id, `${parsed.data.email} as ${parsed.data.role}`],
    );
    return res.rows[0]!.token as string;
  });

  // Send the invite by email when configured; the link always works.
  const link = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/${token}`;
  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.NOTIFICATIONS_FROM_EMAIL ?? "KinOS <brief@kinos.family>",
        to: parsed.data.email,
        subject: `${ctx.member.display_name ?? "Your family"} invited you to ${ctx.workspace.name} on KinOS`,
        text: `You've been invited to help look after the people you love, together.\n\nAccept the invitation: ${link}\n\nKinOS — the private family operating system.`,
      }),
    }).catch(() => {});
  }

  revalidatePath("/app/settings");
  return { ok: true, message: link };
}

export async function acceptInvitationAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const token = z.string().min(8).parse(formData.get("token"));
  const name = nameSchema.parse(formData.get("yourName"));
  await withUser(userId, async (db) => {
    await db.query(`select accept_invitation($1, $2)`, [token, name]);
  });
  redirect("/app");
}

const consentSchema = z.object({
  subjectId: z.string().uuid(),
  granteeMemberId: z.string().uuid(),
  scope: z.enum(["health", "money", "documents", "location", "full"]),
});

export async function grantConsentAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = consentSchema.safeParse({
    subjectId: formData.get("subjectId"),
    granteeMemberId: formData.get("granteeMemberId"),
    scope: formData.get("scope"),
  });
  if (!parsed.success) return { ok: false, message: "Pick a person, a member, and a scope." };

  await withUser(ctx.userId, async (db) => {
    await db.query(
      `insert into consent_grant (subject_id, grantee_member_id, scope, granted_by)
       values ($1, $2, $3, $4)`,
      [parsed.data.subjectId, parsed.data.granteeMemberId, parsed.data.scope, ctx.member.id],
    );
    await db.query(
      `insert into access_log (workspace_id, actor_member_id, action, target)
       values ($1, $2, 'granted_consent', $3)`,
      [ctx.workspace.id, ctx.member.id, `${parsed.data.scope} on ${parsed.data.subjectId}`],
    );
  });
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function revokeConsentAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const grantId = z.string().uuid().parse(formData.get("grantId"));
  await withUser(ctx.userId, async (db) => {
    await db.query(
      `update consent_grant set revoked_at = now() where id = $1 and revoked_at is null`,
      [grantId],
    );
    await db.query(
      `insert into access_log (workspace_id, actor_member_id, action, target)
       values ($1, $2, 'revoked_consent', $3)`,
      [ctx.workspace.id, ctx.member.id, grantId],
    );
  });
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function raiseEmergencyAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const subjectId = z.string().uuid().parse(formData.get("subjectId"));
  const note = z.string().max(500).optional().parse(formData.get("note") ?? undefined);

  const alertId = await withUser(ctx.userId, async (db) => {
    const res = await db.query(
      `insert into emergency_alert (subject_id, raised_by, note) values ($1, $2, $3)
       returning id`,
      [subjectId, ctx.member.id, note ?? null],
    );
    return res.rows[0]!.id as string;
  });

  // Notify every member, urgently, plus record who was reached.
  await withService(async (db) => {
    const members = await db.query(
      `select m.id, m.display_name from family_member m
       join care_subject s on s.workspace_id = m.workspace_id
       where s.id = $1`,
      [subjectId],
    );
    const subject = await db.query(`select display_name from care_subject where id = $1`, [subjectId]);
    const { notifyMember } = await import("../notify");
    for (const m of members.rows) {
      await notifyMember({
        memberId: m.id,
        title: `Emergency raised for ${subject.rows[0]?.display_name ?? "your loved one"}`,
        body: note ?? "Open the Emergency Layer for their medical summary and contacts.",
        link: `/app/emergency?subject=${subjectId}`,
        priority: "urgent",
      });
    }
    await db.query(
      `update emergency_alert set contacts_notified = $2 where id = $1`,
      [alertId, JSON.stringify(members.rows.map((m) => m.display_name))],
    );
  });

  revalidatePath("/app/emergency");
  return { ok: true, id: alertId };
}
