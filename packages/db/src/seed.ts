/**
 * Seed a realistic demo family: the Moyos.
 *
 * Tari (diaspora daughter, admin, in London) and Sarah (local coordinator)
 * care for Mum (elder Orbit, Harare) and Tendai (school-age Orbit), with
 * Grace as a professional caregiver.
 *
 *   DATABASE_URL=postgres://... pnpm --filter @kinos/db seed
 *
 * Sign-in afterwards is by magic link to the demo addresses (see README).
 */
import { withService, closePool, type DbClient } from "./client";

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}
function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3_600_000).toISOString();
}

async function one<T extends Record<string, unknown>>(
  db: DbClient,
  sql: string,
  params: unknown[],
): Promise<T> {
  const res = await db.query(sql, params as never[]);
  return res.rows[0] as T;
}

async function main() {
  await withService(async (db) => {
    console.log("Seeding the Moyo family…");

    const users: Record<string, string> = {};
    for (const [name, email] of [
      ["Tari Moyo", "tari@demo.kinos.family"],
      ["Sarah Moyo", "sarah@demo.kinos.family"],
      ["Grace Ncube", "grace@demo.kinos.family"],
    ] as const) {
      const row = await one<{ id: string }>(
        db,
        `insert into app_user (name, email, email_verified) values ($1, $2, now())
         on conflict (email) do update set name = excluded.name
         returning id`,
        [name, email],
      );
      users[email] = row.id;
    }
    const tariUser = users["tari@demo.kinos.family"]!;
    const sarahUser = users["sarah@demo.kinos.family"]!;
    const graceUser = users["grace@demo.kinos.family"]!;

    const ws = await one<{ id: string }>(
      db,
      `insert into family_workspace (name, created_by, plan_id)
       values ('Moyo Family', $1, 'family_plus') returning id`,
      [tariUser],
    );

    const member = async (userId: string, name: string, role: string) =>
      (
        await one<{ id: string }>(
          db,
          `insert into family_member (workspace_id, user_id, display_name, role)
           values ($1, $2, $3, $4) returning id`,
          [ws.id, userId, name, role],
        )
      ).id;

    const tari = await member(tariUser, "Tari", "admin");
    const sarah = await member(sarahUser, "Sarah", "member");
    const grace = await member(graceUser, "Grace", "caregiver");

    const subject = async (name: string, kind: string, checkinBy: string | null) =>
      (
        await one<{ id: string }>(
          db,
          `insert into care_subject (workspace_id, display_name, kind, timezone, expected_checkin_by)
           values ($1, $2, $3, 'Africa/Harare', $4) returning id`,
          [ws.id, name, kind, checkinBy],
        )
      ).id;

    const mum = await subject("Mum", "elder", "11:00");
    const tendai = await subject("Tendai", "child", null);

    // Grace may see Mum's health-level items while caring for her.
    await db.query(
      `insert into consent_grant (subject_id, grantee_member_id, scope, granted_by)
       values ($1, $2, 'health', $3)`,
      [mum, grace, tari],
    );

    await db.query(
      `insert into emergency_profile (subject_id, blood_type, conditions, allergies, medications, instructions)
       values ($1, 'O+', '{hypertension}', '{penicillin}', '{"Amlodipine 5mg"}',
               'Dr. Chikafu at Avenues Clinic knows her history.')`,
      [mum],
    );
    await db.query(
      `insert into emergency_contact (subject_id, name, phone, relationship, priority) values
       ($1, 'Sarah Moyo', '+263771000001', 'daughter', 1),
       ($1, 'Tari Moyo', '+447700900001', 'daughter (UK)', 2)`,
      [mum],
    );

    const med = await one<{ id: string }>(
      db,
      `insert into medication (subject_id, name, dose, schedule, refill_at)
       values ($1, 'Amlodipine', '5mg', '{"times": ["08:00", "20:00"]}', $2)
       returning id`,
      [mum, new Date(Date.now() + 4 * 86_400_000).toISOString().slice(0, 10)],
    );
    await db.query(
      `insert into dose_log (medication_id, subject_id, status, at, member_id)
       values ($1, $2, 'taken', $3, $4)`,
      [med.id, mum, hoursAgo(3), grace],
    );

    const signal = (
      subjectId: string,
      memberId: string | null,
      type: string,
      source: string,
      value: unknown,
      privacy: string,
      at: string,
    ) =>
      db.query(
        `insert into life_signal (subject_id, member_id, signal_type, source, value, privacy_level, occurred_at)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [subjectId, memberId, type, source, JSON.stringify(value), privacy, at],
      );

    await signal(mum, grace, "checkin", "manual_checkin",
      { mood: "okay", ate: true, note: "Lunch was light" }, "family", hoursAgo(3));
    await signal(mum, grace, "medication_dose", "manual_checkin",
      { medication: "Amlodipine", status: "taken" }, "caregiver_visible", hoursAgo(3));
    await signal(mum, sarah, "receipt", "receipt_scan",
      { merchant: "Greenwood Pharmacy", amount: 23.5, currency: "USD" }, "family", hoursAgo(5));
    await signal(mum, null, "metric", "manual_metric",
      { metric: "sleep_minutes", value: 340 }, "medical_private", hoursAgo(8));
    await signal(tendai, sarah, "checkin", "manual_checkin",
      { mood: "good", note: "Pickup confirmed, homework club after school" }, "family", hoursAgo(2));

    const appt = await one<{ id: string }>(
      db,
      `insert into appointment (subject_id, kind, title, location, starts_at, transport_owner_member_id, transport_confirmed)
       values ($1, 'clinic', 'Clinic review', 'Avenues Clinic', $2, $3, false)
       returning id`,
      [mum, hoursFromNow(26), sarah],
    );

    await db.query(
      `insert into duty (subject_id, title, owner_member_id, due_at, priority, created_by) values
       ($1, 'Confirm transport for the clinic review', $2, $3, 'high', $4),
       ($1, $5, $2, $6, 'normal', $4),
       ($7, $8, $4, $9, 'normal', $4)`,
      [
        mum, sarah, hoursFromNow(10), tari,
        "Buy the week's groceries", hoursFromNow(30),
        tendai, "Pay next term's school fees", hoursFromNow(24 * 6),
      ],
    );

    await db.query(
      `insert into attention_event
        (subject_id, kind, severity, title, detail, owner_member_id, escalate_at, dedupe_key)
       values ($1, 'transport_unconfirmed', 'attention',
               'Transport not confirmed for Clinic review',
               $2, $3, $4, $5)`,
      [
        mum,
        "Sarah hasn't confirmed transport · Avenues Clinic",
        sarah,
        hoursFromNow(6),
        `transport_unconfirmed:${appt.id}`,
      ],
    );

    const pot = await one<{ id: string }>(
      db,
      `insert into money_pot (workspace_id, subject_id, name, currency, balance)
       values ($1, $2, $3, 'USD', 0) returning id`,
      [ws.id, mum, "Mum's care fund"],
    );
    const contrib = await one<{ id: string }>(
      db,
      `insert into contribution (pot_id, member_id, amount, currency, note)
       values ($1, $2, 200, 'USD', 'July support') returning id`,
      [pot.id, tari],
    );
    const exp = await one<{ id: string }>(
      db,
      `insert into expense (pot_id, member_id, amount, currency, category, note)
       values ($1, $2, 23.5, 'USD', 'medication', 'Greenwood Pharmacy') returning id`,
      [pot.id, grace],
    );
    await db.query(
      `insert into ledger_entry (pot_id, ref_type, ref_id, credit, debit) values
       ($1, 'contribution', $2, 200, 0), ($1, 'expense', $3, 0, 23.5)`,
      [pot.id, contrib.id, exp.id],
    );
    await db.query(`update money_pot set balance = 176.5 where id = $1`, [pot.id]);

    await db.query(
      `insert into family_record_item (subject_id, kind, title, body, author_member_id) values
       ($1, 'decision', 'Sarah handles clinic transport',
        'Agreed on the family call: Sarah owns transport to all clinic visits; Tari covers costs from the pot.', $2),
       ($1, 'note', $4,
        'Greenwood Pharmacy on Fife Avenue is the new one — they keep Amlodipine in stock.', $3)`,
      [mum, tari, sarah, "Dad's old pharmacy closed"],
    );

    await db.query(
      `insert into daily_brief (subject_id, kind, body, actions, for_date)
       values ($1, 'morning', $2, $3, current_date)`,
      [
        mum,
        "Mum is okay today. Morning medication was taken and breakfast eaten. Lunch was light and her mood seems a little low. Attention needed: Sarah hasn't confirmed transport for tomorrow's clinic review.",
        JSON.stringify([
          { label: "Assign transport", kind: "assign_transport", targetId: appt.id },
          { label: "Send Sarah a nudge", kind: "nudge_member" },
        ]),
      ],
    );

    for (const step of [
      "workspace_created",
      "orbit_created",
      "member_added",
      "first_checkin",
      "first_duty",
      "first_brief",
    ]) {
      await db.query(
        `insert into activation_event (workspace_id, step) values ($1, $2)
         on conflict do nothing`,
        [ws.id, step],
      );
    }

    console.log("Seed complete. Sign in by magic link as:");
    console.log("  tari@demo.kinos.family · sarah@demo.kinos.family · grace@demo.kinos.family");
  });
  await closePool();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
