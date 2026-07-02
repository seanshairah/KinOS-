/**
 * RLS policy tests — the automated proof behind the consent guarantees:
 *
 *   1. a non-member cannot read another family's workspace
 *   2. a caregiver cannot read medical_private signals
 *   3. consent unlocks caregiver_visible; revoking blocks immediately
 *   4. life_signal is append-only
 *   5. a viewer only sees family-level signals
 *   6. money pots are hidden without role or money consent
 *
 * They run against a real Postgres with the migrations applied
 * (Neon branch or local docker). Without RLS_TEST_DATABASE_URL they skip,
 * so unit CI stays green; the db-policy CI job runs them for real.
 */
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.RLS_TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("row-level security", () => {
  let pool: pg.Pool;

  let aliceId: string; // admin of family A
  let bobId: string; // admin of family B (outsider to A)
  let caraId: string; // caregiver in family A
  let veraId: string; // viewer in family A

  let wsA: string;
  let subjectA: string;
  let caraMemberId: string;
  let familySignalId: string;
  let privateSignalId: string;

  /** Run fn as an authenticated app user (RLS enforced via kinos_app). */
  async function asUser<T>(
    userId: string,
    fn: (c: pg.PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role kinos_app");
      await client.query("select set_config('app.user_id', $1, true)", [userId]);
      const out = await fn(client);
      await client.query("commit");
      return out;
    } catch (err) {
      await client.query("rollback").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async function rows<T extends Record<string, unknown>>(
    userId: string,
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    return asUser(userId, async (c) => (await c.query(sql, params as never[])).rows as T[]);
  }

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url });
    const stamp = Date.now();

    const mkUser = async (name: string) =>
      (
        await pool.query<{ id: string }>(
          `insert into app_user (name, email, email_verified) values ($1, $2, now()) returning id`,
          [name, `${name.toLowerCase()}+${stamp}@rls.test`],
        )
      ).rows[0]!.id;

    aliceId = await mkUser("Alice");
    bobId = await mkUser("Bob");
    caraId = await mkUser("Cara");
    veraId = await mkUser("Vera");

    // Family A via the bootstrap RPC (as Alice, through RLS role).
    wsA = await asUser(aliceId, async (c) => {
      const r = await c.query<{ create_workspace: string }>(
        `select create_workspace('Family A', 'Alice')`,
      );
      return r.rows[0]!.create_workspace;
    });

    subjectA = await asUser(aliceId, async (c) => {
      const r = await c.query<{ id: string }>(
        `insert into care_subject (workspace_id, display_name, kind)
         values ($1, 'Gogo', 'elder') returning id`,
        [wsA],
      );
      return r.rows[0]!.id;
    });

    // Cara (caregiver) + Vera (viewer) added by service (admin path).
    caraMemberId = (
      await pool.query<{ id: string }>(
        `insert into family_member (workspace_id, user_id, display_name, role)
         values ($1, $2, 'Cara', 'caregiver') returning id`,
        [wsA, caraId],
      )
    ).rows[0]!.id;
    await pool.query(
      `insert into family_member (workspace_id, user_id, display_name, role)
       values ($1, $2, 'Vera', 'viewer')`,
      [wsA, veraId],
    );

    // Family B: Bob alone.
    await asUser(bobId, (c) =>
      c.query(`select create_workspace('Family B', 'Bob')`),
    );

    familySignalId = await asUser(aliceId, async (c) => {
      const r = await c.query<{ id: string }>(
        `insert into life_signal (subject_id, signal_type, source, value, privacy_level)
         values ($1, 'checkin', 'manual_checkin', '{"mood": "okay"}', 'family')
         returning id`,
        [subjectA],
      );
      return r.rows[0]!.id;
    });

    privateSignalId = (
      await pool.query<{ id: string }>(
        `insert into life_signal (subject_id, signal_type, source, value, privacy_level)
         values ($1, 'metric', 'manual_metric', '{"metric": "glucose", "value": 5.8}', 'medical_private')
         returning id`,
        [subjectA],
      )
    ).rows[0]!.id;
  }, 60_000);

  afterAll(async () => {
    await pool?.end();
  });

  it("a non-member cannot read another family's workspace, subjects, or signals", async () => {
    expect(
      await rows(bobId, `select id from family_workspace where id = $1`, [wsA]),
    ).toEqual([]);
    expect(
      await rows(bobId, `select id from care_subject where id = $1`, [subjectA]),
    ).toEqual([]);
    expect(
      await rows(bobId, `select id from life_signal where subject_id = $1`, [subjectA]),
    ).toEqual([]);
  });

  it("family-level signals are visible to members, including the caregiver", async () => {
    expect(
      await rows(caraId, `select id from life_signal where id = $1`, [familySignalId]),
    ).toHaveLength(1);
  });

  it("a caregiver cannot read medical_private signals", async () => {
    expect(
      await rows(caraId, `select id from life_signal where id = $1`, [privateSignalId]),
    ).toEqual([]);
  });

  it("consent unlocks caregiver_visible; revoking blocks immediately", async () => {
    const cgSignal = (
      await pool.query<{ id: string }>(
        `insert into life_signal (subject_id, signal_type, source, value, privacy_level)
         values ($1, 'voice_note', 'caregiver_voice_note', '{"note": "appetite low"}', 'caregiver_visible')
         returning id`,
        [subjectA],
      )
    ).rows[0]!.id;

    // No grant yet → invisible.
    expect(
      await rows(caraId, `select id from life_signal where id = $1`, [cgSignal]),
    ).toEqual([]);

    // Alice grants health consent → visible.
    const grantId = await asUser(aliceId, async (c) => {
      const r = await c.query<{ id: string }>(
        `insert into consent_grant (subject_id, grantee_member_id, scope)
         values ($1, $2, 'health') returning id`,
        [subjectA, caraMemberId],
      );
      return r.rows[0]!.id;
    });
    expect(
      await rows(caraId, `select id from life_signal where id = $1`, [cgSignal]),
    ).toHaveLength(1);

    // Revoke → blocked on the very next query.
    await asUser(aliceId, (c) =>
      c.query(`update consent_grant set revoked_at = now() where id = $1`, [grantId]),
    );
    expect(
      await rows(caraId, `select id from life_signal where id = $1`, [cgSignal]),
    ).toEqual([]);
  });

  it("a viewer sees family signals only", async () => {
    const visible = await rows<{ privacy_level: string }>(
      veraId,
      `select privacy_level from life_signal where subject_id = $1`,
      [subjectA],
    );
    expect(visible.length).toBeGreaterThan(0);
    for (const row of visible) expect(row.privacy_level).toBe("family");
  });

  it("life_signal is append-only, even for an admin member", async () => {
    await expect(
      asUser(aliceId, (c) =>
        c.query(`update life_signal set unit = 'tampered' where id = $1`, [familySignalId]),
      ),
    ).rejects.toThrow();
    await expect(
      asUser(aliceId, (c) =>
        c.query(`delete from life_signal where id = $1`, [familySignalId]),
      ),
    ).rejects.toThrow();
  });

  it("an outsider cannot insert signals into family A", async () => {
    await expect(
      asUser(bobId, (c) =>
        c.query(
          `insert into life_signal (subject_id, signal_type, source, value)
           values ($1, 'checkin', 'manual_checkin', '{"mood": "good"}')`,
          [subjectA],
        ),
      ),
    ).rejects.toThrow();
  });

  it("money pots are hidden from caregivers without money consent", async () => {
    await asUser(aliceId, (c) =>
      c.query(
        `insert into money_pot (workspace_id, subject_id, name) values ($1, $2, 'Care fund')`,
        [wsA, subjectA],
      ),
    );
    expect(await rows(caraId, `select id from money_pot`)).toEqual([]);
    expect((await rows(aliceId, `select id from money_pot`)).length).toBeGreaterThan(0);
  });

  it("the RPC money path enforces its own permission checks", async () => {
    await expect(
      asUser(caraId, async (c) => {
        const pot = await c.query<{ id: string }>(
          `select id from money_pot limit 1`,
        );
        // Cara can't even see the pot; use a random uuid to hit the guard.
        const potId = pot.rows[0]?.id ?? "00000000-0000-4000-8000-000000000000";
        await c.query(`select record_contribution($1, 50, 'USD', null)`, [potId]);
      }),
    ).rejects.toThrow();
  });

  // ---------- health: the per-metric dial ----------

  describe("health readings and the per-metric dial", () => {
    let readingId: string;
    let observationId: string;

    beforeAll(async () => {
      // Service paths (a device webhook, the reducer) write a reading and
      // its derived observation.
      readingId = (
        await pool.query<{ id: string }>(
          `insert into health_reading (subject_id, metric, value, source)
           values ($1, 'blood_pressure', '{"systolic":152,"diastolic":94}', 'withings')
           returning id`,
          [subjectA],
        )
      ).rows[0]!.id;
      observationId = (
        await pool.query<{ id: string }>(
          `insert into health_observation (subject_id, metric, kind, summary)
           values ($1, 'blood_pressure', 'drift', 'Blood pressure was outside the usual range today.')
           returning id`,
          [subjectA],
        )
      ).rows[0]!.id;
    });

    it("without health consent, neither numbers nor observations are visible", async () => {
      // Cara's earlier grant was revoked above; Vera never had one.
      for (const uid of [caraId, veraId, bobId]) {
        expect(await rows(uid, `select id from health_reading where id = $1`, [readingId])).toEqual([]);
        expect(await rows(uid, `select id from health_observation where id = $1`, [observationId])).toEqual([]);
      }
    });

    it("health consent at the default dial shows observations, never numbers", async () => {
      await asUser(aliceId, (c) =>
        c.query(
          `insert into consent_grant (subject_id, grantee_member_id, scope)
           values ($1, $2, 'health')`,
          [subjectA, caraMemberId],
        ),
      );
      expect(await rows(caraId, `select id from health_observation where id = $1`, [observationId])).toHaveLength(1);
      expect(await rows(caraId, `select id from health_reading where id = $1`, [readingId])).toEqual([]);
    });

    it("dialling the metric to 'readings' reveals numbers to the consented; admins are bound by the dial too", async () => {
      // Before the dial: even the admin sees no raw numbers.
      expect(await rows(aliceId, `select id from health_reading where id = $1`, [readingId])).toEqual([]);

      await asUser(aliceId, (c) =>
        c.query(
          `insert into health_share_scope (subject_id, metric, level)
           values ($1, 'blood_pressure', 'readings')`,
          [subjectA],
        ),
      );
      expect(await rows(caraId, `select id from health_reading where id = $1`, [readingId])).toHaveLength(1);
      expect(await rows(aliceId, `select id from health_reading where id = $1`, [readingId])).toHaveLength(1);
    });

    it("'status' hides observations from consented members; admins still see them", async () => {
      await asUser(aliceId, (c) =>
        c.query(
          `update health_share_scope set level = 'status'
           where subject_id = $1 and metric = 'blood_pressure'`,
          [subjectA],
        ),
      );
      expect(await rows(caraId, `select id from health_observation where id = $1`, [observationId])).toEqual([]);
      expect(await rows(caraId, `select id from health_reading where id = $1`, [readingId])).toEqual([]);
      expect(await rows(aliceId, `select id from health_observation where id = $1`, [observationId])).toHaveLength(1);
    });

    it("only an admin or the centre can touch the dial", async () => {
      await expect(
        asUser(caraId, (c) =>
          c.query(
            `insert into health_share_scope (subject_id, metric, level)
             values ($1, 'heart_rate', 'readings')`,
            [subjectA],
          ),
        ),
      ).rejects.toThrow();
    });

    it("a caregiver can enter a manual reading and see their own entry; nobody can rewrite one", async () => {
      const entered = await asUser(caraId, async (c) => {
        const r = await c.query<{ id: string }>(
          `insert into health_reading (subject_id, member_id, metric, value, source)
           values ($1, $2, 'heart_rate', '{"value":72}', 'manual') returning id`,
          [subjectA, caraMemberId],
        );
        return r.rows[0]!.id;
      });
      // The author sees what they typed, even though heart_rate sits at the
      // default dial; other members still don't.
      expect(await rows(caraId, `select id from health_reading where id = $1`, [entered])).toHaveLength(1);
      expect(await rows(veraId, `select id from health_reading where id = $1`, [entered])).toEqual([]);
      await expect(
        asUser(aliceId, (c) =>
          c.query(`update health_reading set value = '{"systolic":120}' where id = $1`, [readingId]),
        ),
      ).rejects.toThrow();
      await expect(
        asUser(aliceId, (c) =>
          c.query(`delete from health_reading where id = $1`, [readingId]),
        ),
      ).rejects.toThrow();
    });

    it("an outsider cannot write health readings into family A", async () => {
      await expect(
        asUser(bobId, (c) =>
          c.query(
            `insert into health_reading (subject_id, metric, value, source)
             values ($1, 'steps', '{"value":100}', 'manual')`,
            [subjectA],
          ),
        ),
      ).rejects.toThrow();
    });

    it("device-account links (tokens) are unreachable from the app role", async () => {
      await expect(
        asUser(aliceId, (c) => c.query(`select id from health_source_link`)),
      ).rejects.toThrow();
    });
  });
});

if (!url) {
  describe("row-level security (skipped)", () => {
    it("skips without RLS_TEST_DATABASE_URL — point it at a migrated Postgres to enable", () => {
      expect(true).toBe(true);
    });
  });
}
