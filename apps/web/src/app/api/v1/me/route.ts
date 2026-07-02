import { NextResponse } from "next/server";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { getFamilyContext } from "@/lib/data/context";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const ctx = await getFamilyContext(userId);
    if (!ctx) {
      // Signed in, but not yet part of a family space — the app sends
      // them to the web onboarding.
      return NextResponse.json({ userId, member: null, workspace: null });
    }
    return NextResponse.json({
      userId,
      member: {
        id: ctx.member.id,
        displayName: ctx.member.display_name,
        role: ctx.member.role,
      },
      workspace: { id: ctx.workspace.id, name: ctx.workspace.name },
    });
  } catch (err) {
    return serverError(err);
  }
}
