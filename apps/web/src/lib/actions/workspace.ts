"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withUser, withService } from "@kinos/db";
import { PLANS, orbitCap, isLocale, type PlanId } from "@kinos/config";
import { requireFamilyContext, requireUserId } from "../data/context";
import { COMFORT_COOKIE, LOCALE_COOKIE } from "../i18n";

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
  template: z
    .enum([
      "",
      "elderly_parent",
      "child_school",
      "post_surgery",
      "chronic_care",
      "caregiver_managed",
      "diaspora_parent",
    ])
    .default(""),
});

/**
 * Care templates — a running start for the common shapes of care. Each
 * seeds a couple of starter duties and a care-plan skeleton the family
 * edits into their own; nothing here is medical advice, only structure.
 */
const CARE_TEMPLATES: Record<
  string,
  {
    checkinBy?: string;
    duties: string[];
    plan: Partial<Record<"daily_routine" | "dietary_notes" | "family_rules", string>>;
  }
> = {
  elderly_parent: {
    checkinBy: "10:00",
    duties: ["Set up the week's medication", "Arrange the next clinic visit"],
    plan: {
      daily_routine: "Morning check-in by 10:00. A short walk if the day allows.",
      family_rules: "One person owns transport for every clinic visit — confirmed the night before.",
    },
  },
  child_school: {
    checkinBy: "07:00",
    duties: ["Confirm the school run for this week", "File the latest school forms"],
    plan: {
      daily_routine: "School-day mornings start at 06:30. Homework before screens.",
    },
  },
  post_surgery: {
    checkinBy: "09:00",
    duties: ["Book the follow-up review", "Collect the prescribed medication"],
    plan: {
      daily_routine: "Rest first. Short, gentle movement as advised at discharge.",
      family_rules: "Any new pain or swelling is worth a check — contact the clinic if concerned.",
    },
  },
  chronic_care: {
    checkinBy: "09:00",
    duties: ["Set up refill reminders for regular medication", "Plan the next routine review"],
    plan: {
      daily_routine: "Medication with breakfast and dinner. Readings noted when taken.",
    },
  },
  caregiver_managed: {
    checkinBy: "08:00",
    duties: ["Agree the caregiver's visit days", "Write the care plan together"],
    plan: {
      family_rules: "The caregiver logs each visit; the family reads the evening brief.",
    },
  },
  diaspora_parent: {
    checkinBy: "10:00",
    duties: ["Set up the Money Pot for care costs", "Arrange the daily check-in text"],
    plan: {
      daily_routine: "A morning check-in — by app or a simple text — and a weekly family call.",
      family_rules: "Receipts go in the record the day money is spent. Proof is the trust.",
    },
  },
};

export async function createOrbitAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = orbitSchema.safeParse({
    displayName: formData.get("displayName"),
    kind: formData.get("kind"),
    timezone: formData.get("timezone") || "Africa/Harare",
    expectedCheckinBy: formData.get("expectedCheckinBy") ?? "",
    template: formData.get("template") ?? "",
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

  const template = parsed.data.template ? CARE_TEMPLATES[parsed.data.template] : undefined;
  const id = await withUser(ctx.userId, async (db) => {
    const res = await db.query(
      `insert into care_subject (workspace_id, display_name, kind, timezone, expected_checkin_by)
       values ($1, $2, $3, $4, $5) returning id`,
      [
        ctx.workspace.id,
        parsed.data.displayName,
        parsed.data.kind,
        parsed.data.timezone,
        parsed.data.expectedCheckinBy || template?.checkinBy || null,
      ],
    );
    const subjectId = res.rows[0]!.id as string;
    if (template) {
      for (const title of template.duties) {
        await db.query(
          `insert into duty (subject_id, title, created_by) values ($1, $2, $3)`,
          [subjectId, title, ctx.member.id],
        );
      }
      if (Object.keys(template.plan).length > 0) {
        await db.query(
          `insert into care_plan (subject_id, daily_routine, dietary_notes, family_rules, updated_by)
           values ($1, $2, $3, $4, $5) on conflict (subject_id) do nothing`,
          [
            subjectId,
            template.plan.daily_routine ?? null,
            template.plan.dietary_notes ?? null,
            template.plan.family_rules ?? null,
            ctx.member.id,
          ],
        );
      }
    }
    await db.query(
      `insert into activation_event (workspace_id, step) values ($1, 'orbit_created')
       on conflict do nothing`,
      [ctx.workspace.id],
    );
    return subjectId;
  });

  revalidatePath("/app");
  return { ok: true, id };
}

const inviteSchema = z.object({
  // Email is optional: the natural motion is a link shared in the family
  // chat. An address only adds email delivery when it's configured.
  email: z
    .union([z.string().email(), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
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
  const emailLabel = parsed.data.email ?? "shared link";

  // The plan's people cap counts seats already taken plus doors already open.
  const planId = (ctx.workspace.plan_id in PLANS ? ctx.workspace.plan_id : "free") as PlanId;
  const seats = await withUser(ctx.userId, async (db) => {
    const res = await db.query(
      `select
         (select count(*)::int from family_member where workspace_id = $1) as members,
         (select count(*)::int from invitation
           where workspace_id = $1 and status = 'pending' and expires_at > now()) as pending`,
      [ctx.workspace.id],
    );
    return res.rows[0] as { members: number; pending: number };
  });
  if (seats.members + seats.pending >= PLANS[planId].maxMembers) {
    return {
      ok: false,
      message: `The ${PLANS[planId].name} plan holds ${PLANS[planId].maxMembers} people. Upgrade to invite more of the family.`,
    };
  }

  const token = await withUser(ctx.userId, async (db) => {
    const res = await db.query(
      `insert into invitation (workspace_id, email, role, scopes, invited_by)
       values ($1, $2, $3, $4, $5) returning token`,
      [ctx.workspace.id, parsed.data.email, parsed.data.role, parsed.data.scopes, ctx.member.id],
    );
    await db.query(
      `insert into access_log (workspace_id, actor_member_id, action, target)
       values ($1, $2, 'invited_member', $3)`,
      [ctx.workspace.id, ctx.member.id, `${emailLabel} as ${parsed.data.role}`],
    );
    return res.rows[0]!.token as string;
  });

  // Send the invite by email when configured; the link always works.
  const link = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://kinos.family"}/invite/${token}`;
  if (process.env.RESEND_API_KEY && parsed.data.email) {
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
  scope: z.enum(["health", "money", "documents", "location", "wellness_checks", "full"]),
  // 0 = open-ended; otherwise the grant quietly lapses on its own.
  expiresInDays: z.coerce.number().int().min(0).max(365).default(0),
});

export async function grantConsentAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = consentSchema.safeParse({
    subjectId: formData.get("subjectId"),
    granteeMemberId: formData.get("granteeMemberId"),
    scope: formData.get("scope"),
    expiresInDays: formData.get("expiresInDays") ?? 0,
  });
  if (!parsed.success) return { ok: false, message: "Pick a person, a member, and a scope." };

  await withUser(ctx.userId, async (db) => {
    await db.query(
      `insert into consent_grant (subject_id, grantee_member_id, scope, granted_by, expires_at)
       values ($1, $2, $3, $4,
               case when $5::int > 0 then now() + make_interval(days => $5::int) end)`,
      [
        parsed.data.subjectId,
        parsed.data.granteeMemberId,
        parsed.data.scope,
        ctx.member.id,
        parsed.data.expiresInDays,
      ],
    );
    await db.query(
      `insert into access_log (workspace_id, actor_member_id, action, target)
       values ($1, $2, 'granted_consent', $3)`,
      [ctx.workspace.id, ctx.member.id, `${parsed.data.scope} on ${parsed.data.subjectId}`],
    );
    await db.query(
      `insert into trust_log (workspace_id, actor_member_id, action, subject_id, detail)
       values ($1, $2, 'changed_consent', $3, $4)`,
      [ctx.workspace.id, ctx.member.id, parsed.data.subjectId, `granted ${parsed.data.scope}`],
    );
  });
  revalidatePath("/app/settings");
  revalidatePath("/app/consent");
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
    await db.query(
      `insert into trust_log (workspace_id, actor_member_id, action, detail)
       values ($1, $2, 'changed_consent', 'revoked a grant')`,
      [ctx.workspace.id, ctx.member.id],
    );
  });
  revalidatePath("/app/settings");
  revalidatePath("/app/consent");
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
    await db.query(
      `insert into trust_log (workspace_id, actor_member_id, action, subject_id)
       values ($1, $2, 'raised_alert', $3)`,
      [ctx.workspace.id, ctx.member.id, subjectId],
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

const deleteSchema = z.object({ confirmName: z.string().min(1) });

/**
 * Delete the family space — the exit the Privacy Policy promises. The
 * database RPC re-checks that the caller is an admin; the typed name is
 * a human-level brake, not the security boundary.
 */
export async function deleteWorkspaceAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  if (ctx.member.role !== "admin") {
    return { ok: false, message: "Only an admin can delete the family space." };
  }
  const parsed = deleteSchema.safeParse({ confirmName: formData.get("confirmName") });
  if (!parsed.success || parsed.data.confirmName.trim() !== ctx.workspace.name) {
    return { ok: false, message: "Type the family space's exact name to confirm." };
  }
  await withUser(ctx.userId, (db) =>
    db.query(`select delete_workspace($1)`, [ctx.workspace.id]),
  );
  redirect("/app/onboarding");
}

/**
 * Leave a family space on your own — the counterpart to deletion, for
 * members who aren't admins (or admins who've handed the keys on). The RPC
 * re-checks the last-admin guard; typing the space's name is the human brake.
 * The workspace cookie is cleared so context re-resolves to another space,
 * or to onboarding if this was the last one.
 */
export async function leaveWorkspaceAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = deleteSchema.safeParse({ confirmName: formData.get("confirmName") });
  if (!parsed.success || parsed.data.confirmName.trim() !== ctx.workspace.name) {
    return { ok: false, message: "Type the family space's exact name to confirm." };
  }
  try {
    await withUser(ctx.userId, (db) => db.query(`select leave_workspace($1)`, [ctx.workspace.id]));
  } catch {
    return {
      ok: false,
      message: "Make another member an admin before you leave, or delete the space.",
    };
  }
  (await cookies()).delete("kinos_ws");
  redirect("/app");
}

/**
 * Set the language KinOS speaks to this person in. A per-browser choice held
 * in a cookie — no account change, so it applies immediately and travels with
 * the device, which is right when several family members share one phone.
 */
export async function setLocaleAction(formData: FormData): Promise<void> {
  const locale = formData.get("locale");
  if (isLocale(locale)) {
    (await cookies()).set(LOCALE_COOKIE, locale, {
      httpOnly: false, // read by the client for offline/error surfaces too
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  redirect("/app/settings");
}

/**
 * Comfort mode — larger text, stronger contrast. A per-device choice like
 * the language: the lounge tablet can hold it while a phone stays compact.
 */
export async function setComfortAction(formData: FormData): Promise<void> {
  const store = await cookies();
  if (formData.has("comfort")) {
    store.set(COMFORT_COOKIE, "1", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    store.delete(COMFORT_COOKIE);
  }
  redirect("/app/settings");
}

/**
 * Switch which family space this browser is looking at. Membership is
 * verified under RLS before the cookie moves; a forged workspace id
 * simply matches nothing.
 */
export async function switchWorkspaceAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const target = z.string().uuid().safeParse(formData.get("workspaceId"));
  if (!target.success) redirect("/app/settings");
  const member = await withUser(userId, async (db) => {
    const res = await db.query(
      `select 1 from family_member where workspace_id = $1 and user_id = $2`,
      [target.data, userId],
    );
    return Boolean(res.rows[0]);
  });
  if (member) {
    (await cookies()).set("kinos_ws", target.data, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  redirect("/app");
}
