import { NextResponse, type NextRequest } from "next/server";
import { withService } from "@kinos/db";

export const dynamic = "force-dynamic";

/**
 * Withings notification endpoint.
 *
 * Withings expects a fast 200 on both the HEAD verification it performs
 * when a callback is registered and on every data notification (a form
 * POST naming the user and the data window — never the data itself; that
 * is fetched separately with the linked account's tokens).
 *
 * Until WITHINGS_CLIENT_ID / WITHINGS_CLIENT_SECRET are configured and the
 * fetch stage lands, notifications for linked accounts are parked in
 * pipeline_dead_letter (stage: withings_fetch) so nothing is silently
 * dropped; unknown accounts are acknowledged and ignored.
 */

export function HEAD() {
  return new Response(null, { status: 200 });
}

export function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const externalUserId = form?.get("userid")?.toString();
  if (!externalUserId) return NextResponse.json({ received: true });

  const payload = {
    userid: externalUserId,
    appli: form?.get("appli")?.toString() ?? null,
    startdate: form?.get("startdate")?.toString() ?? null,
    enddate: form?.get("enddate")?.toString() ?? null,
    configured: Boolean(process.env.WITHINGS_CLIENT_ID && process.env.WITHINGS_CLIENT_SECRET),
  };

  // Acknowledge fast no matter what; park the work, never the response.
  await withService(async (db) => {
    const link = await db.query(
      `select id, subject_id from health_source_link
       where provider = 'withings' and external_user_id = $1 and status = 'active'`,
      [externalUserId],
    );
    if (!link.rows[0]) return;
    await db.query(
      `insert into pipeline_dead_letter (stage, error, payload)
       values ('withings_fetch', 'measurement fetch not yet implemented', $1)`,
      [JSON.stringify({ ...payload, link_id: link.rows[0].id, subject_id: link.rows[0].subject_id })],
    );
  }).catch(() => {});

  return NextResponse.json({ received: true });
}
