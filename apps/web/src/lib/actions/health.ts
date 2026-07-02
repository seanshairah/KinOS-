"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { requireFamilyContext } from "../data/context";
import type { ActionResult } from "./workspace";

/**
 * The per-metric sharing dial. Postgres decides who may turn it (admin or
 * the person themselves) — this action just carries the request.
 */

const dialSchema = z.object({
  subjectId: z.string().uuid(),
  metric: z.enum(["blood_pressure", "heart_rate", "sleep_minutes", "steps", "weight"]),
  level: z.enum(["readings", "observations", "status"]),
});

export async function setHealthSharingAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = dialSchema.safeParse({
    subjectId: formData.get("subjectId"),
    metric: formData.get("metric"),
    level: formData.get("level"),
  });
  if (!parsed.success) return { ok: false, message: "Pick a metric and a sharing level." };

  try {
    await withUser(ctx.userId, async (db) => {
      await db.query(
        `insert into health_share_scope (subject_id, metric, level, set_by)
         values ($1, $2, $3, $4)
         on conflict (subject_id, metric)
         do update set level = excluded.level, set_by = excluded.set_by, updated_at = now()`,
        [parsed.data.subjectId, parsed.data.metric, parsed.data.level, ctx.member.id],
      );
      await db.query(
        `insert into access_log (workspace_id, actor_member_id, action, target)
         values ($1, $2, 'health_sharing_changed', $3)`,
        [ctx.workspace.id, ctx.member.id, `${parsed.data.metric} → ${parsed.data.level}`],
      );
    });
  } catch {
    return { ok: false, message: "Only an admin or the person themselves can change sharing." };
  }
  revalidatePath(`/app/orbits/${parsed.data.subjectId}`);
  return { ok: true };
}
