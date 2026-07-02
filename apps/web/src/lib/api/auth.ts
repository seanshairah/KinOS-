import { createHash, randomBytes, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { serviceQuery } from "@kinos/db";

/**
 * The mobile door into the same house. Native apps authenticate with a
 * six-digit code emailed to the family member, then hold a session token
 * in the very same auth_session table the web uses. Every data query
 * still runs under the RLS role — this layer only answers "who is
 * asking"; the database decides what they may see.
 */

const CODE_TTL_MINUTES = 10;
const SESSION_DAYS = 90;

function hashCode(email: string, code: string): string {
  return createHash("sha256").update(`${email}:${code}:kinos-v1`).digest("hex");
}

export async function requestSignInCode(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const code = String(randomInt(100000, 1000000));

  // One live code per address — a new request quietly replaces the old.
  await serviceQuery(`delete from auth_verification_token where identifier = $1`, [
    `code:${email}`,
  ]);
  await serviceQuery(
    `insert into auth_verification_token (identifier, token, expires)
     values ($1, $2, now() + interval '${CODE_TTL_MINUTES} minutes')`,
    [`code:${email}`, hashCode(email, code)],
  );

  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.NOTIFICATIONS_FROM_EMAIL ?? "KinOS <brief@kinos.family>",
        to: email,
        subject: `${code} is your KinOS sign-in code`,
        text: `Your KinOS sign-in code is ${code}.\n\nIt works for ${CODE_TTL_MINUTES} minutes. If you didn't ask for it, you can ignore this email — nothing happens without the code.`,
      }),
    }).catch(() => {});
  } else {
    console.log(`\n[kinos] sign-in code for ${email}: ${code}\n`);
  }
}

export async function verifySignInCode(
  rawEmail: string,
  code: string,
): Promise<{ sessionToken: string; userId: string } | null> {
  const email = rawEmail.trim().toLowerCase();
  const consumed = await serviceQuery(
    `delete from auth_verification_token
     where identifier = $1 and token = $2 and expires > now()
     returning identifier`,
    [`code:${email}`, hashCode(email, code.trim())],
  );
  if (consumed.rowCount === 0) return null;

  const user = await serviceQuery<{ id: string }>(
    `insert into app_user (email, email_verified) values ($1, now())
     on conflict (email) do update set email_verified = now()
     returning id`,
    [email],
  );
  const sessionToken = randomBytes(32).toString("hex");
  await serviceQuery(
    `insert into auth_session (session_token, user_id, expires)
     values ($1, $2, now() + interval '${SESSION_DAYS} days')`,
    [sessionToken, user.rows[0]!.id],
  );
  return { sessionToken, userId: user.rows[0]!.id };
}

/** Resolve the bearer session token to a user id, or null. */
export async function apiUserId(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const res = await serviceQuery<{ user_id: string }>(
    `select user_id from auth_session where session_token = $1 and expires > now()`,
    [token],
  );
  return res.rows[0]?.user_id ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "sign in first" }, { status: 401 });
}

export function serverError(err: unknown) {
  console.error("[api/v1]", err);
  return NextResponse.json({ error: "something went wrong on our side" }, { status: 500 });
}
