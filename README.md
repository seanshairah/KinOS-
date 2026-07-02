<p align="center">
  <img src="apps/web/public/icon.svg" width="72" alt="The KinOS Orbit mark" />
</p>

<h1 align="center">Kin<span>OS</span></h1>

<p align="center"><i>The private family operating system — the people you love, in one calm orbit.</i></p>

KinOS turns scattered life updates — check-ins, receipts, medications,
appointments, voice notes — into quiet awareness: what is happening, what
needs attention, who is responsible, and what must not be forgotten.

It is deliberately **not** a health tracker, a diagnosis app, a caregiver
checklist, or a chat thread. It is the operating layer that connects those
jobs — consent-native, calm by default, with the intelligence invisible.

## The monorepo

```
kinos/
  apps/web/               Next.js 15 App Router PWA — marketing site + product
  packages/
    ui/                   Dusk design system: tokens, Orbit mark, components
    engine/               Life Signals engine: normalize · baselines · attention ·
                          brief · patterns · escalation (pure, 39 unit tests)
    db/                   Neon Postgres: migrations, RLS policies, typed rows,
                          client (SET LOCAL ROLE), seed, RLS policy test suite
    ai/                   Server-only intelligence layer: extract · write · recall,
                          strict schemas, voice guard, local embeddings
    payments/             Stripe + Paynow adapters, double-entry ledger,
                          idempotent reconciliation state machine
    config/               zod env, plan catalogue + gating, flags, i18n scaffolding
  scripts/check-language.mjs   CI guard: no machine language in the product
  .github/workflows/ci.yml     typecheck · lint · unit · RLS · e2e · build
```

## Three non-negotiables (enforced, not aspirational)

1. **The word for machine intelligence never renders.** A CI language guard
   scans every product-facing file; the e2e suite asserts it against rendered
   pages; a runtime voice guard filters model output. The product speaks
   KinOS language: Daily Brief, Life Signals, Attention Needed, Worth a check.
2. **Consent is enforced in Postgres.** Every user query runs as a
   non-owner role under row-level security, with the authenticated user
   pinned per transaction. A caregiver without a health grant cannot read a
   private entry — the database won't return it. Revocation blocks the very
   next query. `packages/db/tests/rls.test.ts` proves it in CI.
3. **Calm by default.** Attention is judged against each person's own
   baseline; unreliable evidence stays silent; ember only ever means
   attention. When nothing is wrong, the screen is warm and quiet.

## Run it

```bash
corepack enable && pnpm install

# 1. Point at Postgres (Neon, or local — pgvector required) and migrate
export DATABASE_URL=postgres://…
pnpm --filter @kinos/db migrate

# 2. Seed the demo family (the Moyos: two Orbits, caregiver, care fund)
pnpm db:seed

# 3. Configure the app
cp .env.example apps/web/.env.local   # set DATABASE_URL + AUTH_SECRET (min.)

# 4. Run
pnpm dev                              # http://localhost:3000
```

Sign in with `tari@demo.kinos.family` (diaspora admin), `sarah@…` (local
coordinator) or `grace@…` (caregiver). Without `RESEND_API_KEY`, the
magic link is printed to the server console — copy it into the browser.

Everything degrades gracefully: no `DATABASE_URL` → guided setup screen;
no model key → deterministic briefs and notes queued for review; no Blob
token → uploads skipped; no Stripe → contributions recorded directly.

## Verify

```bash
node scripts/check-language.mjs      # the language guard
pnpm -r typecheck && pnpm -r lint
pnpm -r test                         # engine, payments, ai (58 tests)

# RLS policy suite against a real database
RLS_TEST_DATABASE_URL=$DATABASE_URL pnpm --filter @kinos/db test

# e2e: marketing + the full activation flow
pnpm --filter @kinos/web build
E2E_DATABASE_URL=$DATABASE_URL pnpm --filter @kinos/web e2e
```

## Deploy

- **Web:** Vercel. Set the env vars from `.env.example`; `vercel.json`
  schedules the cron jobs (morning/evening Daily Brief, attention sweep,
  escalation sweep — guarded by `CRON_SECRET`).
- **Database:** Neon. Run `pnpm --filter @kinos/db migrate` on deploy;
  migrations are idempotent and recorded in `schema_migrations`.
- **Webhooks:** point Stripe at `/api/webhooks/stripe` and Paynow's result
  URL at `/api/webhooks/paynow`.

## Documents

- `DECISIONS.md` — engineering decisions and their reasoning
- `docs/ERD.md` — the data model
- `packages/ai/README.md` — the intelligence layer's contract and PII handling

---

KinOS is a family coordination and life-awareness platform. It is not a
medical device, diagnosis tool, emergency service, or replacement for
healthcare professionals. If something seems urgent, contact local
emergency or medical services.

## Mobile (apps/mobile)

The native app is an Expo (React Native) client of the same house:

- **Same brain** — it talks to `/api/v1/*` JSON routes in `apps/web`; every
  query still runs under the database's RLS role, so the phone can never see
  more than the member's consent allows.
- **Same look** — the Dusk tokens are imported from `@kinos/ui/dusk`.
- **Sign-in the family way** — a six-digit code emailed to the member
  (no passwords); the session token lives in the device keychain.

Run it against production:

```bash
cd apps/mobile
pnpm start            # scan the QR with Expo Go
# point at a local server instead:
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3000 pnpm start
```

Store builds happen through EAS (`npx eas build`) once Apple/Google
accounts exist — bundle id `family.kinos.app` on both platforms.
