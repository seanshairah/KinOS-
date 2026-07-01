"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withService, withUser } from "@kinos/db";
import { requireFamilyContext } from "../data/context";
import { rememberRecordItem } from "../pipeline";
import type { ActionResult } from "./workspace";

const uploadSchema = z.object({
  subjectId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  privacy: z.enum(["family", "medical_private"]).default("family"),
});

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);
const MAX_BYTES = 8 * 1024 * 1024;

/** The document vault: prescriptions, reports, IDs — filed to the record. */
export async function uploadDocumentAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = uploadSchema.safeParse({
    subjectId: formData.get("subjectId"),
    title: formData.get("title"),
    privacy: formData.get("privacy") ?? "family",
  });
  if (!parsed.success) return { ok: false, message: "Give the document a name." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a file to add." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, message: "PDFs and photos work here (PDF, JPG, PNG, WebP)." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "That file is over 8 MB — a photo or export usually isn't. Try a smaller one." };
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false, message: "File storage isn't configured for this deployment yet." };
  }

  const { put } = await import("@vercel/blob");
  const blob = await put(
    `${ctx.workspace.id}/documents/${parsed.data.subjectId}/${Date.now()}-${file.name}`,
    file,
    { access: "public", addRandomSuffix: true },
  );

  const recordId = await withUser(ctx.userId, async (db) => {
    const record = await db.query(
      `insert into family_record_item (subject_id, kind, title, body, privacy_level, author_member_id)
       values ($1, 'document', $2, $3, $4, $5) returning id`,
      [
        parsed.data.subjectId,
        parsed.data.title,
        `Document: ${file.name}`,
        parsed.data.privacy,
        ctx.member.id,
      ],
    );
    await db.query(
      `insert into document (subject_id, record_item_id, storage_path, mime, title, privacy_level)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        parsed.data.subjectId,
        record.rows[0]!.id,
        blob.url,
        file.type,
        parsed.data.title,
        parsed.data.privacy,
      ],
    );
    return record.rows[0]!.id as string;
  });

  // Family-level documents join the recall index by title.
  if (parsed.data.privacy === "family") {
    await withService((db) =>
      rememberRecordItem(db, parsed.data.subjectId, recordId, `Document: ${parsed.data.title}`),
    ).catch(() => {});
  }

  revalidatePath("/app/record");
  return { ok: true };
}

export async function uploadDocumentForm(formData: FormData): Promise<void> {
  await uploadDocumentAction(formData);
}
