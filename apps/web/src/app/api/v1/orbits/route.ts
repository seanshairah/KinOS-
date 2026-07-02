import { NextResponse } from "next/server";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { listOrbits } from "@/lib/data/orbits";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const orbits = await listOrbits(userId);
    return NextResponse.json({
      orbits: orbits.map((o) => ({
        subjectId: o.subject.id,
        name: o.subject.display_name,
        status: o.status,
        lastCheckin: o.lastCheckin,
        lastCheckinMood: o.lastCheckinMood,
        openAttention: o.openAttention,
        openDuties: o.openDuties,
        nextAppointment: o.nextAppointment,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
