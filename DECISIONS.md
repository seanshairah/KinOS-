# DECISIONS

Engineering decisions, with the reasoning. Where the brief was silent or
sources conflicted, the tie-breaker order was: privacy → calm UX → product
integrity → scalability → real-world usefulness.

## Platform

**D1 — Neon instead of Supabase (owner decision, mid-build).**
The product owner switched the database platform to Neon. Neon provides
serverless Postgres + pgvector, so the schema, RLS model, and Family Memory
carried over. The Supabase-specific services were replaced:

| Supabase piece | Replacement | Why this one |
|---|---|---|
| Auth | Auth.js v5 + Resend magic links, custom uuid Postgres adapter | Owner-selected. No new vendor; sessions live in our own tables; matches the email-OTP requirement. |
| Storage | Vercel Blob | Owner-selected. Zero-config on the Vercel deploy target; keys are unguessable and only surfaced through RLS-guarded `document`/`expense` rows. Hardening path: move to R2/S3 + signed URLs if stricter download auth is required. |
| Realtime | Calm polling (45 s visible-tab refresh) | Owner-selected. The product is deliberately calm; sub-second push adds infra without family value at MVP. The `AutoRefresh` component is the single seam where a push channel plugs in later. |
| Edge Functions / cron | Vercel Cron → `/api/jobs/*` route handlers | Same JobQueue posture as the brief: idempotent, retry-safe, replaceable by Inngest without touching callers. |

**D2 — RLS survives the migration (non-negotiable #2).**
Policies are identical in spirit to the Supabase design, but the user
context is supplied by the data layer: every user-facing query runs inside
`BEGIN; SET LOCAL ROLE kinos_app; set_config('app.user_id', …); …` where
`kinos_app` is a NOLOGIN role that cannot bypass RLS and policies read
`app_user_id()`. Grants are verb-level (life_signal has no UPDATE/DELETE
grant at all). Service paths (pipeline, webhooks, cron) run as the owner and
carry explicit permission checks. The RLS test suite proves the guarantees
against a real Postgres in CI.

## Data & engine

**D3 — Money writes only through SQL functions.** `record_contribution` /
`record_expense` are `security definer` RPCs that write contribution +
double-entry ledger + balance in one transaction, with permission checks
inside. App code cannot express an inconsistent pot. Webhook settlement
mirrors the same three writes inside one service transaction, driven by an
idempotent state machine (`decideReconciliation`) — terminal intents never
move, settlement happens exactly once.

**D4 — Attention idempotency in the schema.** `attention_event.dedupe_key`
with a partial unique index over live statuses. Rules can re-run every 15
minutes (and on every capture) without duplicating events; resolution keys
(`transport_unconfirmed:<appointmentId>`, `duty_overdue:<dutyId>`) let
actions resolve exactly the event they answer.

**D5 — Baselines via Welford, attention vs the person.** Rolling mean/stddev
per subject per metric, updated O(1) at capture time. Deviations below 5
samples or with zero variance are treated as unreliable and stay silent —
calm by default is enforced in math, not copy.

**D6 — The deterministic composer is the floor, the model is the ceiling.**
`composeBriefText` (pure, tested) always produces a correct, calm brief.
The intelligence layer rewrites it more warmly when configured, but its
output must pass the voice guard (banned machine/clinical vocabulary) or
the composer's text ships instead. The product is fully functional with no
model key at all: briefs compose deterministically, voice notes queue as
"needs review", recall returns best-matching passages.

**D7 — Embeddings are local by default.** The model provider has no
embeddings endpoint. Family Memory uses a deterministic 1536-dim
feature-hashing embedding (unigrams+bigrams, FNV-1a): zero PII leaves the
server and recall works out of the box. `EmbeddingProvider` is the seam for
a hosted upgrade (e.g. Voyage) with no schema change.

**D8 — Voice transcription happens in the browser.** Web Speech API where
available, typing everywhere else; the optional audio file goes to Blob as
evidence. Server-side speech-to-text is a later add behind the same
`captureVoiceNote(text)` contract.

## Product

**D9 — One workspace per user at MVP.** `getFamilyContext` picks the first
membership; the schema supports many. A workspace switcher is UI work, not
a migration.

**D10 — Plan gating enforced at the choke point.** Orbit caps are checked in
`createOrbitAction` against the plan catalogue (`@kinos/config/plans`), which
also seeds the `plan` table. Billing checkout exists for contributions
(Stripe live, Paynow adapter wired); subscription self-serve checkout is
scaffolded (`createSubscriptionCheckout`) and gated behind operator setup.

**D11 — Escalation ladder is fixed at MVP** (owner → admins after 6h →
admins+emergency after 24h, quiet hours 21:00–07:00 subject-local, urgent
never waits). `escalation_rule` exists for per-family customisation later.

**D12 — Language guard is CI law.** `scripts/check-language.mjs` fails the
build if machine/provider/clinical vocabulary appears in `apps/web` or
`packages/ui`; the e2e suite asserts the same against rendered pages; the
voice guard covers model output at runtime. Three layers, one rule.

**D13 — P2/P3 architected, not built.** Wearable connectors (the manual
`metric` capture type and `wearable` source are the interface), WhatsApp
channel (notify.ts is the channel seam), Caregiver Pro / Care Home (roles,
plans and schema support them). None have UI yet, deliberately.

**D14 — `medical_note` and `document` upload UI deferred.** The tables,
policies and privacy levels ship now; record entries can be marked
health-private. Document upload lands with the Blob-backed vault UI.

## 15. Mobile lives in the monorepo, speaks /api/v1, signs in with a code

One repository: the Expo app shares the engine, the Dusk tokens, the
language guard, and atomic PRs with the API it depends on. Native clients
authenticate with a six-digit emailed code (calmer than passwords, no
deep-link fragility) and hold a bearer token in the same `auth_session`
table the web uses — so "who is asking" has one answer everywhere, and
RLS remains the only authority on what they may see.
