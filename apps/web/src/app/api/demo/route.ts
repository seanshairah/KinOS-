import { createHash, randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getPool, isDatabaseConfigured } from "@kinos/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Keyed demo entrance — a way to walk through a living family space
 * before email delivery is configured. A long random key, minted
 * directly into auth_verification_token for the demo identity, opens a
 * real session for the demo user. Without a valid key this route
 * pretends not to exist. The key grants exactly one family: the demo
 * workspace; RLS scopes every query underneath as usual.
 */

export const dynamic = "force-dynamic";

const DEMO_EMAIL = "demo@kinos.family";

const hashKey = (key: string) =>
  createHash("sha256").update(`demo:${key}:kinos-v1`).digest("hex");

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) return NextResponse.redirect(new URL("/", req.url));
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key.length < 24) return new NextResponse("Not found", { status: 404 });
  if (!(await rateLimit(`demo:${clientIp(req)}`, 10, 3600))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const pool = getPool();
  const valid = await pool.query(
    `select 1 from auth_verification_token
     where identifier = $1 and token = $2 and expires > now()`,
    [DEMO_EMAIL, hashKey(key)],
  );
  if (!valid.rows[0]) return new NextResponse("Not found", { status: 404 });

  const existing = await pool.query(`select id from app_user where email = $1`, [DEMO_EMAIL]);
  const userId: string =
    existing.rows[0]?.id ??
    (
      await pool.query(
        `insert into app_user (name, email, email_verified) values ('Tari', $1, now())
         returning id`,
        [DEMO_EMAIL],
      )
    ).rows[0]!.id;

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await pool.query(
    `insert into auth_session (session_token, user_id, expires) values ($1, $2, $3)`,
    [sessionToken, userId, expires],
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
