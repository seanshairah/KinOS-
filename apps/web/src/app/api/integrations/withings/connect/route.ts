import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { currentUserId } from "@/lib/auth";
import { authorizeUrl, signState, withingsConfigured } from "@/lib/integrations/withings";

export const dynamic = "force-dynamic";

/**
 * Start linking a Withings account to an orbit. Only an admin or the
 * person themselves may link a device to their orbit; the check runs as
 * the caller under RLS, and the subject id travels in HMAC-signed state.
 */
export async function GET(request: NextRequest) {
  if (!withingsConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const userId = await currentUserId();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", request.url));

  const subjectId = z
    .string()
    .uuid()
    .safeParse(request.nextUrl.searchParams.get("subject"));
  if (!subjectId.success) {
    return NextResponse.json({ error: "pick an orbit first" }, { status: 400 });
  }

  const allowed = await withUser(userId, async (db) => {
    const res = await db.query(
      `select 1 from care_subject s
       join family_member m on m.workspace_id = s.workspace_id and m.user_id = $2
       where s.id = $1 and m.role in ('admin','care_recipient')`,
      [subjectId.data, userId],
    );
    return Boolean(res.rows[0]);
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "only an admin or the person themselves can link a device" },
      { status: 403 },
    );
  }

  return NextResponse.redirect(authorizeUrl(signState(subjectId.data, userId)));
}
