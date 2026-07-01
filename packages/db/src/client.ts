import pg from "pg";

/**
 * Neon Postgres access with database-enforced consent.
 *
 * Two execution contexts:
 *  - `withUser(userId, fn)` — every user-facing query. The transaction
 *    downgrades to the non-owner role `kinos_app` (which cannot bypass
 *    row-level security) and pins the authenticated user id where the
 *    policies read it. Consent is enforced by Postgres, not by this code.
 *  - `withService(fn)` — pipeline jobs, webhooks, seeds. Runs as the
 *    owner role; callers perform their own explicit permission checks.
 */

// numeric → number (money stays JS-friendly; amounts are 2dp domain-wide)
pg.types.setTypeParser(1700, (v) => Number.parseFloat(v));

let pool: pg.Pool | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): pg.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    pool = new pg.Pool({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      // Neon requires TLS; local Postgres in CI does not.
      ssl: /localhost|127\.0\.0\.1/.test(url)
        ? undefined
        : { rejectUnauthorized: true },
    });
  }
  return pool;
}

export type DbClient = pg.PoolClient;

export async function withUser<T>(
  userId: string,
  fn: (client: DbClient) => Promise<T>,
): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new Error("withUser requires a uuid user id");
  }
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("set local role kinos_app");
    await client.query("select set_config('app.user_id', $1, true)", [userId]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function withService<T>(
  fn: (client: DbClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** One-off service query without an explicit transaction. */
export async function serviceQuery<R extends pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<R>> {
  return getPool().query<R>(text, params as never[]);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
