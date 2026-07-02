import { NextResponse } from "next/server";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { listOpenAttention } from "@/lib/data/attention";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const items = await listOpenAttention(userId);
    return NextResponse.json({
      attention: items.map((a) => ({
        id: a.id,
        subjectId: a.subject_id,
        subjectName: a.subject_name,
        title: a.title,
        detail: a.detail,
        severity: a.severity,
        status: a.status,
        createdAt: a.created_at,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
