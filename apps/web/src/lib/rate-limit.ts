import { isDatabaseConfigured, serviceQuery } from "@kinos/db";

/**
 * Sliding-window rate limiting on the public edges, counted in Postgres
 * so every serverless instance shares one truth. Fails open: if the
 * database can't be reached the request proceeds — the limiter protects
 * against abuse, it must never become the outage.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  if (!isDatabaseConfigured()) return true;
  try {
    const res = await serviceQuery<{ ok: boolean }>(
      `select rate_limit_check($1, $2, $3) as ok`,
      [key, limit, windowSeconds],
    );
    return res.rows[0]?.ok ?? true;
  } catch {
    return true;
  }
}

/** Best-effort client address for keying (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}
