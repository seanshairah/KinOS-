"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { requireFamilyContext } from "../data/context";
import { captureSignal, captureVoiceNote } from "../pipeline";
import type { ActionResult } from "./workspace";

const checkinSchema = z.object({
  subjectId: z.string().uuid(),
  mood: z.enum(["good", "okay", "low", "unwell"]),
  ate: z.enum(["yes", "no", ""]).optional(),
  note: z.string().max(2000).optional(),
});

export async function submitCheckinAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = checkinSchema.safeParse({
    subjectId: formData.get("subjectId"),
    mood: formData.get("mood"),
    ate: formData.get("ate") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "Pick how they're doing today." };

  const result = await captureSignal(ctx.userId, {
    subjectId: parsed.data.subjectId,
    memberId: ctx.member.id,
    signalType: "checkin",
    source: "manual_checkin",
    value: {
      mood: parsed.data.mood,
      ...(parsed.data.ate ? { ate: parsed.data.ate === "yes" } : {}),
      ...(parsed.data.note ? { note: parsed.data.note } : {}),
    },
  });
  if (!result.ok) return { ok: false, message: result.reason };

  revalidatePath("/app");
  revalidatePath(`/app/orbits/${parsed.data.subjectId}`);
  return { ok: true };
}

const voiceNoteSchema = z.object({
  subjectId: z.string().uuid(),
  text: z.string().trim().min(3).max(8000),
  kind: z.enum(["voice_note", "receipt", "document"]).default("voice_note"),
});

export async function submitVoiceNoteAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = voiceNoteSchema.safeParse({
    subjectId: formData.get("subjectId"),
    text: formData.get("text"),
    kind: formData.get("kind") ?? "voice_note",
  });
  if (!parsed.success) {
    return { ok: false, message: "Say or type a few words first." };
  }

  // Optional audio file → Vercel Blob when configured.
  let audioUrl: string | undefined;
  const audio = formData.get("audio");
  if (audio instanceof File && audio.size > 0 && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(
        `${ctx.workspace.id}/${parsed.data.subjectId}/voice-${Date.now()}.webm`,
        audio,
        { access: "public", addRandomSuffix: true },
      );
      audioUrl = blob.url;
    } catch {
      // The transcript is the signal; audio is best-effort.
    }
  }

  const result = await captureVoiceNote(ctx.userId, {
    subjectId: parsed.data.subjectId,
    memberId: ctx.member.id,
    text: parsed.data.text,
    audioUrl,
    kind: parsed.data.kind,
  });
  if (!result.ok) return { ok: false, message: result.reason };

  revalidatePath(`/app/orbits/${parsed.data.subjectId}`);
  revalidatePath("/app/record");
  return { ok: true, message: "Noted. KinOS filed the details for the family." };
}

const doseSchema = z.object({
  medicationId: z.string().uuid(),
  subjectId: z.string().uuid(),
  status: z.enum(["taken", "missed", "skipped"]),
});

export async function logDoseAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = doseSchema.safeParse({
    medicationId: formData.get("medicationId"),
    subjectId: formData.get("subjectId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { ok: false, message: "Something was off with that dose." };

  await withUser(ctx.userId, async (db) => {
    await db.query(
      `insert into dose_log (medication_id, subject_id, status, member_id)
       values ($1, $2, $3, $4)`,
      [parsed.data.medicationId, parsed.data.subjectId, parsed.data.status, ctx.member.id],
    );
    // Taking a dose resolves its open attention item.
    if (parsed.data.status === "taken") {
      await db.query(
        `update attention_event set status = 'resolved', resolved_at = now()
         where subject_id = $1 and kind = 'missed_dose' and status = 'open'`,
        [parsed.data.subjectId],
      );
    }
  });

  await captureSignal(ctx.userId, {
    subjectId: parsed.data.subjectId,
    memberId: ctx.member.id,
    signalType: "medication_dose",
    source: "manual_checkin",
    value: { medication_id: parsed.data.medicationId, status: parsed.data.status },
  });

  revalidatePath(`/app/orbits/${parsed.data.subjectId}`);
  revalidatePath("/app/attention");
  return { ok: true };
}

const visitSchema = z.object({
  subjectId: z.string().uuid(),
  notes: z.string().max(4000).optional(),
  tasks: z.string().max(2000).optional(),
});

export async function logVisitAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = visitSchema.safeParse({
    subjectId: formData.get("subjectId"),
    notes: formData.get("notes") ?? "",
    tasks: formData.get("tasks") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "Check the visit details." };

  await withUser(ctx.userId, async (db) => {
    await db.query(
      `insert into caregiver_visit (subject_id, caregiver_member_id, check_in, tasks, notes)
       values ($1, $2, now(), $3, $4)`,
      [
        parsed.data.subjectId,
        ctx.member.id,
        JSON.stringify(
          (parsed.data.tasks ?? "")
            .split("\n")
            .map((t) => t.trim())
            .filter(Boolean),
        ),
        parsed.data.notes || null,
      ],
    );
  });

  await captureSignal(ctx.userId, {
    subjectId: parsed.data.subjectId,
    memberId: ctx.member.id,
    signalType: "caregiver_visit",
    source: "manual_checkin",
    value: { notes: parsed.data.notes ?? "" },
  });

  revalidatePath(`/app/orbits/${parsed.data.subjectId}`);
  return { ok: true };
}
