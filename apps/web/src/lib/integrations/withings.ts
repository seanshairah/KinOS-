import { createHmac, timingSafeEqual } from "node:crypto";
import { withService } from "@kinos/db";
import { ingestServiceReadings, type IncomingReading } from "../health";

/**
 * Withings device cloud — the first health source that needs no phone in
 * the loop: a cuff or scale at the centre's home syncs on its own, Withings
 * notifies us, and a sweep turns the notification into readings.
 *
 * OAuth state is HMAC-signed so the callback can trust which subject a
 * link belongs to; tokens live in health_source_link.access and never
 * leave service paths.
 */

const AUTHORIZE_URL = "https://account.withings.com/oauth2_user/authorize2";
const API_URL = "https://wbsapi.withings.net/v2/oauth2";
const MEASURE_URL = "https://wbsapi.withings.net/measure";
const NOTIFY_URL = "https://wbsapi.withings.net/notify";
const STATE_TTL_MS = 15 * 60 * 1000;

export function withingsConfigured(): boolean {
  return Boolean(process.env.WITHINGS_CLIENT_ID && process.env.WITHINGS_CLIENT_SECRET);
}

function stateSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  // Guard against placeholder values: only trust a real absolute URL.
  return url && /^https:\/\/[^\s<>]+$/.test(url)
    ? url.replace(/\/$/, "")
    : "https://kinos.family";
}

export function callbackUrl(): string {
  return `${appUrl()}/api/integrations/withings/callback`;
}

export function notifyCallbackUrl(): string {
  return `${appUrl()}/api/integrations/withings`;
}

// ---------- signed state ----------

export function signState(subjectId: string, userId: string, now = Date.now()): string {
  const payload = `${subjectId}.${userId}.${now + STATE_TTL_MS}`;
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyState(state: string): { subjectId: string; userId: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString();
    const [subjectId, userId, expStr, sig] = decoded.split(".");
    if (!subjectId || !userId || !expStr || !sig) return null;
    const payload = `${subjectId}.${userId}.${expStr}`;
    const expected = createHmac("sha256", stateSecret()).update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    if (Number(expStr) < Date.now()) return null;
    return { subjectId, userId };
  } catch {
    return null;
  }
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.WITHINGS_CLIENT_ID!,
    scope: "user.metrics",
    redirect_uri: callbackUrl(),
    state,
  });
  return `${AUTHORIZE_URL}?${params}`;
}

// ---------- token plumbing ----------

interface WithingsTokens {
  userid: string;
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO
}

async function withingsApi<T>(
  url: string,
  params: Record<string, string>,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const json = (await res.json()) as { status: number; body: T; error?: string };
  if (json.status !== 0) {
    throw new Error(`withings ${params.action}: status ${json.status} ${json.error ?? ""}`);
  }
  return json.body;
}

export async function exchangeCode(code: string): Promise<WithingsTokens> {
  const body = await withingsApi<{
    userid: number | string;
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>(API_URL, {
    action: "requesttoken",
    grant_type: "authorization_code",
    client_id: process.env.WITHINGS_CLIENT_ID!,
    client_secret: process.env.WITHINGS_CLIENT_SECRET!,
    code,
    redirect_uri: callbackUrl(),
  });
  return {
    userid: String(body.userid),
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: new Date(Date.now() + body.expires_in * 1000).toISOString(),
  };
}

async function refreshTokens(refreshToken: string): Promise<WithingsTokens> {
  const body = await withingsApi<{
    userid: number | string;
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>(API_URL, {
    action: "requesttoken",
    grant_type: "refresh_token",
    client_id: process.env.WITHINGS_CLIENT_ID!,
    client_secret: process.env.WITHINGS_CLIENT_SECRET!,
    refresh_token: refreshToken,
  });
  return {
    userid: String(body.userid),
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: new Date(Date.now() + body.expires_in * 1000).toISOString(),
  };
}

/** A valid access token for a link, refreshing (and persisting) if stale. */
async function freshAccessToken(linkId: string, access: WithingsTokens): Promise<string> {
  if (new Date(access.expires_at).getTime() - Date.now() > 60_000) {
    return access.access_token;
  }
  const next = await refreshTokens(access.refresh_token);
  await withService((db) =>
    db.query(`update health_source_link set access = $2 where id = $1`, [
      linkId,
      JSON.stringify(next),
    ]),
  );
  return next.access_token;
}

/** Ask Withings to notify our endpoint for weight (1) and heart/BP (4). */
export async function subscribeNotifications(accessToken: string): Promise<void> {
  for (const appli of ["1", "4"]) {
    await withingsApi(NOTIFY_URL, {
      action: "subscribe",
      access_token: accessToken,
      callbackurl: notifyCallbackUrl(),
      appli,
    }).catch(() => {}); // best-effort per category; the sweep also backfills
  }
}

// ---------- measurements ----------

/** Withings measure types we understand, and the readings they become. */
const MEASTYPES = "1,9,10,11,54";

interface MeasureGroup {
  grpid: number;
  date: number; // unix seconds
  category: number;
  measures: { value: number; type: number; unit: number }[];
}

function toNumber(m: { value: number; unit: number }): number {
  return Math.round(m.value * Math.pow(10, m.unit) * 100) / 100;
}

/** One Withings measure group → zero or more of our readings. */
export function groupToReadings(grp: MeasureGroup): IncomingReading[] {
  if (grp.category !== 1) return []; // 1 = real measurements (2 = goals)
  const takenAt = new Date(grp.date * 1000).toISOString();
  const byType = new Map(grp.measures.map((m) => [m.type, toNumber(m)]));
  const out: IncomingReading[] = [];

  const systolic = byType.get(10);
  const diastolic = byType.get(9);
  if (typeof systolic === "number" && typeof diastolic === "number") {
    out.push({
      metric: "blood_pressure",
      value: { systolic, diastolic },
      unit: "mmHg",
      takenAt,
      externalId: `${grp.grpid}:blood_pressure`,
    });
  }
  const pulse = byType.get(11);
  if (typeof pulse === "number") {
    out.push({
      metric: "heart_rate",
      value: { value: pulse },
      unit: "bpm",
      takenAt,
      externalId: `${grp.grpid}:heart_rate`,
    });
  }
  const weight = byType.get(1);
  if (typeof weight === "number") {
    out.push({
      metric: "weight",
      value: { value: weight },
      unit: "kg",
      takenAt,
      externalId: `${grp.grpid}:weight`,
    });
  }
  const spo2 = byType.get(54);
  if (typeof spo2 === "number") {
    out.push({
      metric: "spo2",
      value: { value: spo2 },
      unit: "%",
      takenAt,
      externalId: `${grp.grpid}:spo2`,
    });
  }
  return out;
}

async function fetchMeasures(
  accessToken: string,
  startdate: number,
  enddate: number,
): Promise<MeasureGroup[]> {
  const body = await withingsApi<{ measuregrps: MeasureGroup[] }>(MEASURE_URL, {
    action: "getmeas",
    access_token: accessToken,
    meastypes: MEASTYPES,
    category: "1",
    startdate: String(startdate),
    enddate: String(enddate),
  });
  return body.measuregrps ?? [];
}

// ---------- the sweep: parked notifications → readings ----------

const MAX_RETRIES = 5;

interface ParkedNotification {
  id: string;
  retries: number;
  payload: {
    link_id?: string;
    subject_id?: string;
    startdate?: string | null;
    enddate?: string | null;
  };
}

/**
 * Process notifications the webhook parked in pipeline_dead_letter.
 * Idempotent end to end: readings dedupe on external_id and attention
 * events on their dedupe key, so re-sweeps are no-ops.
 */
export async function processParkedNotifications(): Promise<number> {
  if (!withingsConfigured()) return 0;

  const parked = await withService(async (db) => {
    const res = await db.query(
      `select id, retries, payload from pipeline_dead_letter
       where stage = 'withings_fetch' and retries < $1
       order by created_at asc limit 25`,
      [MAX_RETRIES],
    );
    return res.rows as ParkedNotification[];
  });

  let processed = 0;
  for (const item of parked) {
    try {
      const { link_id, subject_id } = item.payload;
      if (!link_id || !subject_id) throw new Error("parked payload missing link");

      const link = await withService(async (db) => {
        const res = await db.query(
          `select id, subject_id, access from health_source_link
           where id = $1 and status = 'active'`,
          [link_id],
        );
        return res.rows[0] as { id: string; subject_id: string; access: WithingsTokens } | undefined;
      });
      if (!link?.access) throw new Error("link missing or revoked");

      const token = await freshAccessToken(link.id, link.access);
      const end = item.payload.enddate
        ? Number(item.payload.enddate)
        : Math.floor(Date.now() / 1000);
      const start = item.payload.startdate
        ? Number(item.payload.startdate)
        : end - 7 * 86400;

      const groups = await fetchMeasures(token, start, end + 60);
      const readings = groups.flatMap(groupToReadings);
      if (readings.length > 0) {
        await ingestServiceReadings(link.subject_id, "withings", readings);
      }

      await withService((db) =>
        db.query(`delete from pipeline_dead_letter where id = $1`, [item.id]),
      );
      processed += 1;
    } catch (err) {
      await withService((db) =>
        db.query(
          `update pipeline_dead_letter set retries = retries + 1, error = $2 where id = $1`,
          [item.id, err instanceof Error ? err.message : String(err)],
        ),
      ).catch(() => {});
    }
  }
  return processed;
}
