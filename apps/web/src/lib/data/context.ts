import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDatabaseConfigured, withUser } from "@kinos/db";
import type { MemberRow, WorkspaceRow } from "@kinos/db";
import { currentUserId } from "../auth";

/**
 * Request context helpers. Every page in the product resolves the signed-in
 * user and their family membership through here; queries below always run
 * under the RLS role, so a stale or forged id yields empty results, not data.
 */

export interface FamilyContext {
  userId: string;
  member: MemberRow;
  workspace: WorkspaceRow;
}

export async function requireUserId(): Promise<string> {
  if (!isDatabaseConfigured()) redirect("/setup");
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in");
  return userId;
}

export const WORKSPACE_COOKIE = "kinos_ws";

/** The cookie-preferred workspace, when a request scope exists. */
async function preferredWorkspaceId(): Promise<string | null> {
  try {
    return (await cookies()).get(WORKSPACE_COOKIE)?.value ?? null;
  } catch {
    return null; // outside a request scope (jobs, tests)
  }
}

export async function getFamilyContext(userId: string): Promise<FamilyContext | null> {
  const preferred = await preferredWorkspaceId();
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select m.*, w.id as w_id, w.name as w_name, w.created_by as w_created_by,
              w.plan_id as w_plan_id, w.created_at as w_created_at
       from family_member m
       join family_workspace w on w.id = m.workspace_id
       where m.user_id = $1
       order by m.created_at asc
       limit 12`,
      [userId],
    );
    const row = res.rows.find((r) => r.w_id === preferred) ?? res.rows[0];
    if (!row) return null;
    return {
      userId,
      member: {
        id: row.id,
        workspace_id: row.workspace_id,
        user_id: row.user_id,
        display_name: row.display_name,
        role: row.role,
        created_at: row.created_at,
      },
      workspace: {
        id: row.w_id,
        name: row.w_name,
        created_by: row.w_created_by,
        plan_id: row.w_plan_id,
        created_at: row.w_created_at,
      },
    };
  });
}

/** Context or onboarding — used by every app page. */
export async function requireFamilyContext(): Promise<FamilyContext> {
  const userId = await requireUserId();
  const ctx = await getFamilyContext(userId);
  if (!ctx) redirect("/app/onboarding");
  return ctx;
}

/** Every family space this person belongs to — for the switcher. */
export interface MembershipSummary {
  workspace_id: string;
  workspace_name: string;
  role: string;
}

export async function listMemberships(userId: string): Promise<MembershipSummary[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select m.workspace_id, w.name as workspace_name, m.role
       from family_member m join family_workspace w on w.id = m.workspace_id
       where m.user_id = $1 order by m.created_at asc limit 12`,
      [userId],
    );
    return res.rows as MembershipSummary[];
  });
}
