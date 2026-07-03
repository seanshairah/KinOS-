import { createHash, randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getPool, isDatabaseConfigured } from "@kinos/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Keyed entrance — a one-time sign-in link for a specific seeded account,
 * for use before email delivery (Resend) is configured: founder access,
 * hand-invited beta families. A long random key is minted into
 * auth_verification_token (owner-only table; a compromised app role can't
 * forge one) with the target email as its identifier. This route hashes
 * the presented key, finds the matching token, opens a real session for
 * that account, and burns the token. Without a valid key it 404s.
 */

export const dynamic = "force-dynamic";

const hashKey = (key: string) =>
  createHash("sha256").update(`enter:${key}:kinos-v1`).digest("hex");

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) return NextResponse.redirect(new URL("/", req.url));
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key.length < 32) return new NextResponse("Not found", { status: 404 });
  if (!(await rateLimit(`enter:${clientIp(req)}`, 10, 3600))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const pool = getPool();
  // Single-use: the token is consumed the moment it's presented.
  const consumed = await pool.query<{ identifier: string; expires: Date }>(
    `delete from auth_verification_token
     where token = $1 and identifier like 'enter:%'
     returning identifier, expires`,
    [hashKey(key)],
  );
  const row = consumed.rows[0];
  if (!row || new Date(row.expires) < new Date()) {
    return new NextResponse("Not found", { status: 404 });
  }
  const email = row.identifier.slice("enter:".length);

  const user = await pool.query<{ id: string }>(
    `select id from app_user where email = $1`,
    [email],
  );
  const userId = user.rows[0]?.id;
  if (!userId) return new NextResponse("Not found", { status: 404 });

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
