import { z } from "zod";

/**
 * Server-side environment. Validated once at boot; a missing secret fails
 * loudly at startup instead of quietly at request time.
 *
 * Model/provider keys are server-only by contract — they must never be
 * prefixed NEXT_PUBLIC_ and never reach the client bundle.
 */
const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Neon Postgres (pooled connection string)
  DATABASE_URL: z.string().url().optional(),

  // Auth.js
  AUTH_SECRET: z.string().min(16).optional(),
  AUTH_URL: z.string().url().optional(),

  // File storage (Vercel Blob)
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  // Internal intelligence layer (server-only, invisible in product)
  MODEL_PROVIDER_API_KEY: z.string().min(1).optional(),
  MODEL_ID: z.string().default("claude-opus-4-8"),
  EMBEDDING_DIM: z.coerce.number().int().default(1536),

  // Payments
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYNOW_INTEGRATION_ID: z.string().optional(),
  PAYNOW_INTEGRATION_KEY: z.string().optional(),

  // Notifications
  RESEND_API_KEY: z.string().optional(),
  WEB_PUSH_VAPID_PUBLIC_KEY: z.string().optional(),
  WEB_PUSH_VAPID_PRIVATE_KEY: z.string().optional(),
  NOTIFICATIONS_FROM_EMAIL: z.string().email().default("brief@kinos.family"),

  // Scheduled jobs (Vercel Cron shared secret)
  CRON_SECRET: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

let cachedServer: ServerEnv | null = null;
let cachedClient: ClientEnv | null = null;

export function serverEnv(): ServerEnv {
  if (!cachedServer) {
    const parsed = serverSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid server environment: ${parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`,
      );
    }
    cachedServer = parsed.data;
  }
  return cachedServer;
}

export function clientEnv(): ClientEnv {
  if (!cachedClient) {
    const parsed = clientSchema.safeParse({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    });
    if (!parsed.success) {
      throw new Error(
        `Invalid client environment: ${parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`,
      );
    }
    cachedClient = parsed.data;
  }
  return cachedClient;
}

/** True when the database is configured — the app degrades to a guided setup screen when not. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
