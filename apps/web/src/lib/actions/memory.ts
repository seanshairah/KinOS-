"use server";

import { z } from "zod";
import { embedText, recall, type RecallResult } from "@kinos/ai";
import { withService, withUser } from "@kinos/db";
import { requireFamilyContext } from "../data/context";
import { rememberRecordItem } from "../pipeline";
import type { ActionResult } from "./workspace";

const askSchema = z.object({
  subjectId: z.string().uuid(),
  question: z.string().trim().min(3).max(400),
});

export interface MemoryAnswer extends RecallResult {
  ok: boolean;
}

/**
 * Family Memory recall. The vector search runs service-side because the
 * embeddings table has no user grants — so the membership check here is
 * explicit and mandatory before anything is searched.
 */
export async function askMemoryAction(formData: FormData): Promise<MemoryAnswer> {
  const ctx = await requireFamilyContext();
  const parsed = askSchema.safeParse({
    subjectId: formData.get("subjectId"),
    question: formData.get("question"),
  });
  if (!parsed.success) {
    return { ok: false, answer: "Ask a short question about the record.", sourceIds: [], confident: false };
  }

  // Membership check via RLS: can this user see the subject at all?
  const visible = await withUser(ctx.userId, async (db) => {
    const res = await db.query(`select id from care_subject where id = $1`, [
      parsed.data.subjectId,
    ]);
    return Boolean(res.rows[0]);
  });
  if (!visible) {
    return { ok: false, answer: "That person isn't in your family space.", sourceIds: [], confident: false };
  }

  const embedding = await embedText(parsed.data.question);
  const matches = await withService(async (db) => {
    const res = await db.query(
      `select record_item_id, content, similarity
       from match_records($1, $2, 6)`,
      [parsed.data.subjectId, `[${embedding.join(",")}]`],
    );
    return res.rows.map((r) => ({
      recordItemId: r.record_item_id as string,
      content: r.content as string,
      similarity: Number(r.similarity),
    }));
  });

  const result = await recall(parsed.data.question, matches);
  return { ok: true, ...result };
}

const recordItemSchema = z.object({
  subjectId: z.string().uuid(),
  kind: z.enum(["note", "decision", "incident", "question"]),
  title: z.string().trim().min(2).max(160),
  body: z.string().max(8000).optional().or(z.literal("")),
  privacy: z.enum(["family", "medical_private"]).default("family"),
});

export async function addRecordItemAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = recordItemSchema.safeParse({
    subjectId: formData.get("subjectId"),
    kind: formData.get("kind") ?? "note",
    title: formData.get("title"),
    body: formData.get("body") ?? "",
    privacy: formData.get("privacy") ?? "family",
  });
  if (!parsed.success) return { ok: false, message: "A record entry needs a title." };

  const recordId = await withUser(ctx.userId, async (db) => {
    const res = await db.query(
      `insert into family_record_item (subject_id, kind, title, body, privacy_level, author_member_id)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [
        parsed.data.subjectId,
        parsed.data.kind,
        parsed.data.title,
        parsed.data.body || null,
        parsed.data.privacy,
        ctx.member.id,
      ],
    );
    return res.rows[0]!.id as string;
  });

  // Family-level entries are indexed for recall; private ones are not.
  if (parsed.data.privacy === "family") {
    await withService((db) =>
      rememberRecordItem(
        db,
        parsed.data.subjectId,
        recordId,
        `${parsed.data.title}. ${parsed.data.body ?? ""}`,
      ),
    ).catch(() => {});
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/app/record");
  return { ok: true };
}
