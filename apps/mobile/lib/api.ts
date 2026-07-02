/**
 * The mobile client of /api/v1. One fetch wrapper, typed helpers, no
 * magic — the server (and the database's RLS) does the deciding.
 */

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://kin-os-web.vercel.app";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & T;
  if (!res.ok) {
    throw new ApiError(res.status, String(data?.error ?? "something went wrong"));
  }
  return data;
}

export interface Me {
  userId: string;
  member: { id: string; displayName: string; role: string } | null;
  workspace: { id: string; name: string } | null;
}

export interface Orbit {
  subjectId: string;
  name: string;
  status: "steady" | "attention" | "urgent";
  lastCheckin: string | null;
  lastCheckinMood: string | null;
  openAttention: number;
  openDuties: number;
  nextAppointment: { title: string; starts_at: string; transport_confirmed: boolean } | null;
}

export interface Brief {
  id: string;
  subjectId: string;
  subjectName: string;
  kind: string;
  body: string;
  forDate: string;
  createdAt: string;
}

export interface AttentionItem {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  detail: string | null;
  severity: "info" | "attention" | "urgent";
  status: string;
  createdAt: string;
}

export const api = {
  requestCode: (email: string) =>
    call<{ ok: true }>("/api/v1/auth/request-code", { method: "POST", body: { email } }),
  verifyCode: (email: string, code: string) =>
    call<{ ok: true; sessionToken: string }>("/api/v1/auth/verify", {
      method: "POST",
      body: { email, code },
    }),
  me: (token: string) => call<Me>("/api/v1/me", { token }),
  orbits: (token: string) => call<{ orbits: Orbit[] }>("/api/v1/orbits", { token }),
  checkIn: (
    token: string,
    subjectId: string,
    body: { mood: string; ate?: boolean; note?: string },
  ) => call<{ ok: true }>(`/api/v1/orbits/${subjectId}/check-in`, { method: "POST", body, token }),
  briefs: (token: string) => call<{ briefs: Brief[] }>("/api/v1/brief", { token }),
  attention: (token: string) => call<{ attention: AttentionItem[] }>("/api/v1/attention", { token }),
  actOnAttention: (token: string, id: string, mode: "resolved" | "ack" | "snoozed") =>
    call<{ ok: true }>(`/api/v1/attention/${id}`, { method: "POST", body: { mode }, token }),
};
