import { NextResponse } from "next/server";
import { isDatabaseConfigured, serviceQuery } from "@kinos/db";

export const dynamic = "force-dynamic";

/**
 * Liveness for uptime monitors: 200 when the app can reach its database,
 * 503 when it can't. No internals beyond that — this endpoint is public.
 */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: "database not configured" }, { status: 503 });
  }
  try {
    const res = await serviceQuery<{ n: string }>(`select count(*)::text as n from schema_migrations`);
    return NextResponse.json(
      { ok: true, migrations: Number(res.rows[0]?.n ?? 0) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, reason: "database unreachable" }, { status: 503 });
  }
}
