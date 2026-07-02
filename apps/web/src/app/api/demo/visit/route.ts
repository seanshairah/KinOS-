import { randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getPool, isDatabaseConfigured } from "@kinos/db";

/**
 * The open door — anyone may wander the demo family for a while.
 * Visitors share one identity with the `viewer` role, which the
 * database itself holds to "a quiet window, nothing more" (migration
 * 0006): every write is refused by RLS, so the demo cannot be defaced
 * and no one can raise alerts from it. Sessions are short-lived and
 * swept on entry. If no demo family exists, the door quietly leads home.
 */

export const dynamic = "force-dynamic";

const DEMO_EMAIL = "demo@kinos.family";
const VISITOR_EMAIL = "visitor@kinos.family";

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) return NextResponse.redirect(new URL("/", req.url));
  const pool = getPool();

  // the demo family is wherever the demo identity lives
  const home = await pool.query(
    `select m.workspace_id from family_member m
     join app_user u on u.id = m.user_id
     where u.email = $1 limit 1`,
    [DEMO_EMAIL],
  );
  const workspaceId = home.rows[0]?.workspace_id as string | undefined;
  if (!workspaceId) return NextResponse.redirect(new URL("/", req.url));

  const visitor = await pool.query(
    `insert into app_user (name, email, email_verified) values ('Visitor', $1, now())
     on conflict (email) do update set email_verified = now()
     returning id`,
    [VISITOR_EMAIL],
  );
  const visitorId = visitor.rows[0]!.id as string;

  await pool.query(
    `insert into family_member (workspace_id, user_id, display_name, role)
     select $1, $2, 'Visitor', 'viewer'
     where not exists (
       select 1 from family_member where workspace_id = $1 and user_id = $2
     )`,
    [workspaceId, visitorId],
  );

  // sweep yesterday's visitors, then open a short session
  await pool.query(
    `delete from auth_session where user_id = $1 and expires < now()`,
    [visitorId],
  );
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await pool.query(
    `insert into auth_session (session_token, user_id, expires) values ($1, $2, $3)`,
    [sessionToken, visitorId, expires],
  );

  const secure = req.nextUrl.protocol === "https:";
  const res = NextResponse.redirect(new URL("/app", req.url));
  res.cookies.set(secure ? "__Secure-authjs.session-token" : "authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires,
  });
  return res;
}
