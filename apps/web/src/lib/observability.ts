/**
 * Error tracking, gated by configuration. When SENTRY_DSN (server) or
 * NEXT_PUBLIC_SENTRY_DSN (client) is set, unhandled errors are shipped to
 * Sentry; when it isn't, every function here is a no-op and nothing leaves
 * the process. No SDK — Sentry's ingestion is a documented envelope POST, so
 * this stays dependency-free and runs unchanged on Node, Edge and the browser.
 *
 * We never attach a member's name, email or any Orbit content to an event —
 * only the error, a short tag, and the request path. The family's record does
 * not travel to a third party.
 */

interface Dsn {
  endpoint: string;
  publicKey: string;
}

function parseDsn(raw: string | undefined): Dsn | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const projectId = u.pathname.replace(/^\//, "");
    if (!u.username || !projectId) return null;
    return {
      publicKey: u.username,
      endpoint: `${u.protocol}//${u.host}/api/${projectId}/envelope/`,
    };
  } catch {
    return null;
  }
}

const dsn = parseDsn(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN);

/** True when error tracking is switched on. */
export function observabilityConfigured(): boolean {
  return dsn !== null;
}

function eventId(): string {
  // 32 hex chars, per the Sentry event id format.
  return (globalThis.crypto?.randomUUID?.() ?? "0-0-0-0-0").replace(/-/g, "").padEnd(32, "0").slice(0, 32);
}

function release(): string | undefined {
  return process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_COMMIT_SHA;
}

function environment(): string {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
}

/**
 * Report an error. Best-effort and never throws — an error tracker that can
 * itself break a request would defeat the point.
 */
export async function captureException(
  error: unknown,
  context?: { tag?: string; path?: string; extra?: Record<string, string> },
): Promise<void> {
  if (!dsn) return;
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const id = eventId();
    const header = JSON.stringify({ event_id: id, sent_at: new Date().toISOString() });
    const item = JSON.stringify({ type: "event" });
    const payload = JSON.stringify({
      event_id: id,
      timestamp: Date.now() / 1000,
      platform: "javascript",
      level: "error",
      release: release(),
      environment: environment(),
      tags: context?.tag ? { area: context.tag } : undefined,
      transaction: context?.path,
      exception: {
        values: [
          {
            type: err.name || "Error",
            value: err.message,
            stacktrace: err.stack ? { frames: framesFromStack(err.stack) } : undefined,
          },
        ],
      },
      extra: context?.extra,
    });
    const url = `${dsn.endpoint}?sentry_key=${dsn.publicKey}&sentry_version=7`;
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body: `${header}\n${item}\n${payload}\n`,
      keepalive: true,
    });
  } catch {
    // Swallow — reporting an error must never create one.
  }
}

/** Parse a V8-style stack into Sentry frames (best-effort, oldest first). */
function framesFromStack(stack: string): Array<Record<string, unknown>> {
  const frames: Array<Record<string, unknown>> = [];
  for (const line of stack.split("\n").slice(1, 40)) {
    const m = line.match(/at (?:(.+?) )?\(?(.+?):(\d+):(\d+)\)?$/);
    if (!m) continue;
    frames.push({
      function: m[1] ?? "<anonymous>",
      filename: m[2],
      lineno: Number(m[3]),
      colno: Number(m[4]),
    });
  }
  return frames.reverse();
}
