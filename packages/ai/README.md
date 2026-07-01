# @kinos/ai — the invisible intelligence layer

Server-only. Nothing in this package is ever imported by client components,
and nothing it produces is ever labelled as machine-generated in the product.
The product speaks KinOS language (Daily Brief, Life Signals, Worth a check);
this package is plumbing behind that language.

## Capabilities

| Capability | Input | Output | Fallback |
|---|---|---|---|
| `extract` | voice-note transcript / receipt text / document text | strict JSON `{signals[], followUps[], summary}` with per-item confidence | `null` → pipeline dead-letters the item; nothing is invented |
| `writeBrief` | structured `BriefFacts` from `@kinos/engine` | 3–6 sentence Daily Brief in the family voice | deterministic composer in `@kinos/engine` (always available) |
| `recall` | question + pgvector matches | grounded answer + source record ids | best-matching passage verbatim |

## Contract

- **Strict JSON.** Every call uses schema-constrained output
  (`messages.parse` + `output_config.format`); responses that fail
  validation are retried once, then dropped.
- **The model proposes, the engine decides.** Extraction results become
  `signal_interpretation` rows with stored confidence; attention events are
  created by the rule engine, never directly by the model.
- **Voice guard.** All family-facing text passes `passesVoice()` — a banned
  vocabulary check (machine/provider/clinical terms). Failing text is
  replaced by the deterministic composer's output.
- **Redact, don't guess.** Prompts instruct omission over inference; low
  confidence is surfaced to the family as "worth a check".

## PII handling

- Only the minimum needed context is sent per call: the note text being
  extracted, the day's structured facts, or the matched record passages.
  Full record history, auth identifiers, and contact details are never sent.
- Requests carry no user identifiers; the provider is a processor, not a
  store. Signals keep their `raw` payload in Postgres so extraction can be
  re-run locally if the provider changes.
- Keys live in `MODEL_PROVIDER_API_KEY` (server env only, zod-validated).
  A runtime guard throws if this module is evaluated in a browser context.

## Embeddings

The hosted model API does not provide embeddings. Recall uses a pluggable
`EmbeddingProvider`; the default `LocalHashEmbedding` is a deterministic
1536-dim feature-hashing embedding — zero external calls, PII never leaves
the server, adequate lexical recall at family-record scale. To upgrade
semantic quality, implement `EmbeddingProvider` with a hosted embeddings
service (e.g. Voyage) and call `setEmbeddingProvider()` at boot; stored
vectors remain 1536-dim so no migration is needed.

## Degraded mode

Without `MODEL_PROVIDER_API_KEY` the product remains fully functional:
briefs come from the deterministic composer, recall returns best-match
passages, and voice-note extraction is queued as "needs review" instead of
failing silently.
