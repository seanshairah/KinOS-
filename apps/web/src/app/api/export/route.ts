import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@kinos/db";
import { currentUserId } from "@/lib/auth";
import { exportWorkspaceData } from "@/lib/data/consent";

/** Data portability: the family's record, as they can see it, as JSON. */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "sign in first" }, { status: 401 });

  const data = await exportWorkspaceData(userId);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="kinos-family-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
