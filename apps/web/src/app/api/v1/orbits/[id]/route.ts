import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { getOrbitDetail } from "@/lib/data/orbits";
import { getCarePlan } from "@/lib/data/operating";

export const dynamic = "force-dynamic";

/** One person's whole room, for the app in the hand. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const { id } = await params;
    const subjectId = z.string().uuid().safeParse(id);
    if (!subjectId.success) return NextResponse.json({ error: "bad id" }, { status: 400 });

    const detail = await getOrbitDetail(userId, subjectId.data);
    if (!detail) return NextResponse.json({ error: "not found" }, { status: 404 });
    const plan = await getCarePlan(userId, subjectId.data);

    const takenToday = new Set(
      detail.dosesToday.filter((d) => d.status === "taken").map((d) => d.medication_id),
    );
    return NextResponse.json({
      subject: {
        id: detail.subject.id,
        name: detail.subject.display_name,
        timezone: detail.subject.timezone,
        quietUntil: detail.subject.quiet_until,
        quietNote: detail.subject.quiet_note,
      },
      status: detail.attention.some((a) => a.severity === "urgent")
        ? "urgent"
        : detail.attention.length > 0
          ? "attention"
          : "steady",
      attention: detail.attention.map((a) => ({
        id: a.id,
        title: a.title,
        detail: a.detail,
        severity: a.severity,
      })),
      duties: detail.duties.map((d) => ({
        id: d.id,
        title: d.title,
        ownerName: d.owner_name,
        dueAt: d.due_at,
        status: d.status,
      })),
      medications: detail.medications.map((m) => ({
        id: m.id,
        name: m.name,
        dose: m.dose,
        times: m.schedule?.times ?? [],
        refillAt: m.refill_at,
        takenToday: takenToday.has(m.id),
      })),
      appointments: detail.appointments.map((a) => ({
        id: a.id,
        title: a.title,
        kind: a.kind,
        location: a.location,
        startsAt: a.starts_at,
        transportConfirmed: a.transport_confirmed,
        transportOwnerName: a.transport_owner_name,
      })),
      brief: detail.brief ? { kind: detail.brief.kind, body: detail.brief.body } : null,
      carePlan: plan
        ? {
            dailyRoutine: plan.daily_routine,
            dietaryNotes: plan.dietary_notes,
            mobilityNotes: plan.mobility_notes,
            emergencyInstructions: plan.emergency_instructions,
            preferredPharmacy: plan.preferred_pharmacy,
            doctorName: plan.doctor_name,
            doctorPhone: plan.doctor_phone,
          }
        : null,
      signals: detail.signals.slice(0, 12).map((s) => ({
        id: s.id,
        type: s.signal_type,
        value: s.value,
        occurredAt: s.occurred_at,
      })),
      members: detail.members.map((m) => ({
        id: m.id,
        name: m.display_name,
        role: m.role,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
