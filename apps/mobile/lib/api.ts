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
  // A request that can't finish should fail out loud, not hold the button
  // in "One moment…" forever.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
      signal: abort.signal,
    });
  } catch (err) {
    if (abort.signal.aborted) {
      throw new ApiError(0, "That took too long — check your connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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

export interface PendingCheck {
  id: string;
  subjectId: string;
  subjectName: string;
  checkType: string;
  status: string;
  prompt: string;
  respondBy: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  priority: string;
  readAt: string | null;
  sentAt: string;
}

export interface OrbitDetail {
  subject: { id: string; name: string; timezone: string; quietUntil: string | null; quietNote: string | null };
  status: "steady" | "attention" | "urgent";
  attention: { id: string; title: string; detail: string | null; severity: string }[];
  duties: { id: string; title: string; ownerName: string | null; dueAt: string | null; status: string }[];
  medications: { id: string; name: string; dose: string | null; times: string[]; refillAt: string | null; takenToday: boolean }[];
  appointments: { id: string; title: string; kind: string; location: string | null; startsAt: string; transportConfirmed: boolean; transportOwnerName: string | null }[];
  brief: { kind: string; body: string } | null;
  carePlan: {
    dailyRoutine: string | null;
    dietaryNotes: string | null;
    mobilityNotes: string | null;
    emergencyInstructions: string | null;
    preferredPharmacy: string | null;
    doctorName: string | null;
    doctorPhone: string | null;
  } | null;
  signals: { id: string; type: string; value: Record<string, unknown> | null; occurredAt: string }[];
  members: { id: string; name: string | null; role: string }[];
}

export interface Duty {
  id: string;
  title: string;
  dueAt: string | null;
  priority: string;
  status: string;
  subjectId: string;
  subjectName: string;
  ownerName: string | null;
  ownerMemberId: string | null;
}

export interface RecordItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  at: string;
  subjectId: string;
  subjectName: string;
  authorName: string | null;
}

export interface MoneyPot {
  id: string;
  name: string;
  currency: string;
  balance: number;
  subjectName: string | null;
}

export interface MoneyEntry {
  id: string;
  kind: "contribution" | "expense";
  amount: number;
  currency: string;
  note: string | null;
  category: string | null;
  at: string;
  memberName: string | null;
  potId: string;
}

export interface EmergencyInfo {
  profile: {
    blood_type: string | null;
    conditions: string[];
    allergies: string[];
    medications: string[];
    instructions: string | null;
  } | null;
  contacts: { id: string; name: string; phone: string; relationship: string | null; priority: number }[];
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
  checksAwaitingMe: (token: string) =>
    call<{ checks: PendingCheck[] }>("/api/v1/checks", { token }),
  respondCheck: (
    token: string,
    id: string,
    body: {
      response: "shared" | "later" | "declined";
      metrics?: Record<string, number>;
      note?: string;
    },
  ) => call<{ ok: true; summary: string | null }>(`/api/v1/checks/${id}`, { method: "POST", body, token }),
  notifications: (token: string) =>
    call<{ notifications: AppNotification[] }>("/api/v1/notifications", { token }),
  markNotificationsRead: (token: string) =>
    call<{ ok: true }>("/api/v1/notifications", { method: "POST", body: {}, token }),
  orbitDetail: (token: string, subjectId: string) =>
    call<OrbitDetail>(`/api/v1/orbits/${subjectId}`, { token }),
  duties: (token: string) => call<{ duties: Duty[] }>("/api/v1/duties", { token }),
  createDuty: (
    token: string,
    body: { subjectId: string; title: string; ownerMemberId?: string },
  ) => call<{ ok: true; id: string }>("/api/v1/duties", { method: "POST", body, token }),
  actOnDuty: (token: string, id: string, action: "done" | "mine") =>
    call<{ ok: true }>(`/api/v1/duties/${id}`, { method: "POST", body: { action }, token }),
  logDose: (token: string, medicationId: string, subjectId: string, status = "taken") =>
    call<{ ok: true }>(`/api/v1/medications/${medicationId}/dose`, {
      method: "POST",
      body: { subjectId, status },
      token,
    }),
  confirmTransport: (token: string, appointmentId: string) =>
    call<{ ok: true }>(`/api/v1/appointments/${appointmentId}/transport`, {
      method: "POST",
      body: {},
      token,
    }),
  record: (token: string, q?: string) =>
    call<{ items: RecordItem[] }>(`/api/v1/record${q ? `?q=${encodeURIComponent(q)}` : ""}`, { token }),
  addRecordItem: (
    token: string,
    body: { subjectId: string; kind?: string; title: string; body?: string },
  ) => call<{ ok: true; id: string }>("/api/v1/record", { method: "POST", body, token }),
  money: (token: string) =>
    call<{ pots: MoneyPot[]; entries: MoneyEntry[] }>("/api/v1/money", { token }),
  addMoney: (
    token: string,
    body: {
      potId: string;
      kind: "contribution" | "expense";
      amount: number;
      note?: string;
      category?: string;
    },
  ) => call<{ ok: true }>("/api/v1/money", { method: "POST", body, token }),
  emergency: (token: string, subjectId: string) =>
    call<EmergencyInfo>(`/api/v1/emergency?subject=${subjectId}`, { token }),
  raiseAlert: (token: string, subjectId: string, note?: string) =>
    call<{ ok: true }>("/api/v1/emergency", { method: "POST", body: { subjectId, note }, token }),
  relayHealthReadings: (
    token: string,
    subjectId: string,
    source: "apple_health" | "health_connect",
    readings: HealthReadingPayload[],
  ) =>
    call<{ ok: true; stored: number; observations: number; attentionRaised: number }>(
      "/api/v1/health/readings",
      { method: "POST", body: { subjectId, source, readings }, token },
    ),
};

/** The exact shape one reading takes on /api/v1/health/readings. */
export interface HealthReadingPayload {
  metric:
    | "blood_pressure"
    | "heart_rate"
    | "sleep_minutes"
    | "steps"
    | "weight"
    | "glucose"
    | "spo2";
  value: Record<string, number>;
  unit?: string;
  takenAt?: string;
  externalId?: string;
  device?: Record<string, unknown>;
}
