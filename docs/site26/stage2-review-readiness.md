# Site #26 — Stage 2 adapter/coordinator pre-review packet

**Status:** SOURCE-ONLY DRAFT / NO DEPLOYMENT / READY FOR INDEPENDENT SECURITY CODE REVIEW after exact-commit CI. **NOT READY for real staging or production traffic.**

## Identity and governance

- Owner: Rook (application contracts), coordinated through Control Desk.
- Keel: independent infrastructure/readiness workstream, [Infrastructure #29](https://github.com/BAG-Digital/bagdigital-infrastructure/issues/29). Prior read-only cost/feasibility is not operational acceptance.
- Indigo: site/browser UX and human accessibility; Prism: buyer-facing form/privacy claims.
- Vesper: separate independent reviewer; may return CHANGES REQUIRED and controls all technical-security release dispositions.
- Founder authorizes named services/spending, credential setup, merges and publication separately.
- Vesper Stage 1 [PR #25](https://github.com/BAG-Digital/bagdigital-site/pull/25) exact `fc21d80fb9b2a537956c602f8bd6a42958d8bf19` was **PASS WITH CONDITIONS — offline mock only**, not permission to deploy.

## What this DRAFT actually implements

1. `provider-adapters.mjs` — one, bounded injection-only Turnstile Siteverify call (fixed HTTPS origin, 8-KiB response cap, 3-second default deadline and typed challenge timestamp) and single-attempt fixed `api.resend.com` email-send candidate (fixed configured From/To, sanitized Reply-To, text-only body, capped response/deadline, no automatic retry after ambiguous failure).
2. `sql-coordinator.mjs` — proposed single SQLite-backed DO storage API transactionSync for atomic per-source/global 15-minute quotas, cardinality and in-flight permits, token-HMAC replay claim *before* verification (15-minute tombstone), per-token conditional lease release, canonical-delivery digest/24h dedupe with owner-scoped RESERVED→SENDING→terminal states, and stage/key-version fail-closed behavior. Monotonic high-water time is based on SQLite's calendar clock stored in its own metadata; **its cloud accuracy and provider process-restart behavior are unverified**.
3. `guarded-handler.mjs` — strict duplicate-aware flat string JSON parser, actual body byte cap (16 KiB/413), exact consent/field schema, fixed sender/recipient, server-computed HMAC keys and approval gates, single-call verifier and delivery state transitions, generic PII-free responses and logs.
4. `cloudflare-worker.mjs` plus `worker-entrypoint.mjs` — a **proposed** cloud adapter bound to one named Durable Object per stage that returns **503 unless a separately security-reviewed trusted ingress attester is injected in source**; none is installed, so POST requests remain disabled even if stage and enablement flags are present. It restricts runtime to stage-preview and requires injected secrets. Includes narrowed OPTIONS/CORS for static site. **There is deliberately no Wrangler route/manifest, API domain, vendor secret, deployed Worker, DO namespace, public URL or provider authorization in this branch.**
5. `tests/site26-*.test.mjs` + pinned read-only workflow — Node 22 Web APIs and Node's SQLite DB implementation exercise actual SQL queries/transactions in one process and synthetic fake `fetch` responses, negative validation, quotas, owner-CAS, request/response cap, one mail attempt on ambiguous timeout, and no customer content. **These tests do not instantiate Cloudflare's workerd or a deployed Durable Object; no physical crash+disk recovery was performed.**

## Stage 2 Vesper S26 source remediation (2026-10-16) — requires fresh independent exact-SHA review

Independent [Vesper PR #27 CHANGES REQUIRED #5553639601](https://github.com/BAG-Digital/bagdigital-site/pull/27#pullrequestreview-5553639601) at **older** `946edd6b25daac9b425e9436e31f4b55563c079c` identified four source defects. Current candidate on the **same DRAFT PR #27** proposes:

- **S26-01:** `cloudflare-worker.mjs` uses the pure, Node-testable `worker-entrypoint.mjs` for controlled 503 fallback. Missing stage, DO stub lookup errors, verifier/relay constructor failures and thrown/rejected handlers are tested; no leaked exception messages and no spurious provider calls. The Cloudflare-specific `DurableObject` class is NOT executed in Node CI, only the exact shared entrypoint function is.
- **S26-02:** Concrete Cloudflare Worker intentionally installs **NO** `resolveTrustedIngress` adapter. All real Worker POST/OPTIONS processing stays disabled (503), even if the environment flag is mistakenly true. Headers, `request.cf`, `CF-Connecting-IP`, `X-Real-IP`, Origin and caller-controlled data NEVER mint trusted source identity. The pure entrypoint accepts an explicitly **server-code injected attester** for *synthetic tests only*, not by visitor/env configuration; modified/missing, subrequest-looking and spoofed metadata tests reject, while a separately injected synthetic attestation uses a fixed fake source independent of headers. Keel must independently prove exact edge/zone provenance and ingress trust before any future separately reviewed attester is added. **A source-level PASS here cannot enable even synthetic hosted traffic by itself.**
- **S26-03:** `readBody` now has a **single 3-second maximum elapsed body-read budget** from reader acquisition; the clock does NOT reset on each chunk. Timeout rejects with safe HTTP **408** before admission and without verifier or email, makes best-effort asynchronous cancellation without awaiting a possibly hostile unresolved cancel promise, and releases the reader lock. Deterministic injected-timeout tests cover stalled first chunk and slow trickle; a separate streamed oversize assertion preserves 413. Real platform limits, proxy WAF and max concurrent preadmission readers remain separately required.
- **S26-04:** An injected telemetry logger throwing synchronously or returning a rejected promise cannot change a committed `ACCEPTED` logical record or the visitor's HTTP **202**. Tests check no duplicate delivery with a fresh CAPTCHA token.
- Added `tests/site26-worker.test.mjs` to CI and syntax checks for `intake/stage2/worker-entrypoint.mjs`. Existing workflow remains pinned and read-only. CI is *Node synthetic*, NOT Cloudflare workerd or real third-party verification.

**Operational hold is unchanged:** Without Keel's independently attested ingress/Worker and SQLite Durable Object transaction proof, chosen and approved host/relay costs and secrets, real staged provider verification, Indigo/Prism privacy/UX, Site #7 old FormSubmit retirement, and founder's separate enrollment/merge/publication permissions, do not add a real ingress attester, deploy, enable or send email. Rook's source fixes do not close ARCH24-05 or authorize an operational preview.

## Residual security limits for independent Vesper review

- **ARCH24-05 remains OPEN:** Keel has not proved deployed trusted ingress. Cloudflare headers are **not** an attestation. Worker-to-Worker subrequests can affect source attribution; `request.cf` or `CF-Connecting-IP` presence alone proves nothing. The concrete Worker therefore has no working trusted-ingress resolver and fails closed by construction. **Do not turn on the Worker** until ingress provenance, origin isolation, WAF and anti-proxy spoofing are independently verified and a new exact-SHA ingress adapter is separately reviewed.
- The SQL implementation uses `transactionSync` on the single proposed SQLite-backed DO. Node `DatabaseSync` tests verify comparable SQL invariants in one SQLite connection **only**. Need Cloudflare workerd multi-Worker contention, transaction abort, durable restart, wall-clock/key-rotation migration, TTL/GC and store-failure evidence before any real user traffic.
- No sender DNS verification, API credentials or real email acceptance/inbox proof. Sender timeout is hard-bounded by application Promise.race + AbortController, but if an upstream accepted before timeout the outcome remains **UNKNOWN and the same canonical inquiry is never automatically resent**; this may suppress legitimate repeats for up to 24h. Real operational state recovery under a durable outage and “accepted-but-response-lost” provider case must be tested separately.
- Turnstile candidate Siteverify request and response are mocked; actual challenge hostname/action, replay policy, client-side widget and staged sitekeys are not configured. No CAPTCHA bypass or malicious vendor tests authorized by this source PR.
- No first-party public webpage has been modified or connected. [Site PR #21](https://github.com/BAG-Digital/bagdigital-site/pull/21) still contains an **unpublished FormSubmit form**, while public main currently exposes the older weak FormSubmit. [Site #7](https://github.com/BAG-Digital/bagdigital-site/issues/7) remains OPEN, and [draft PR #22](https://github.com/BAG-Digital/bagdigital-site/pull/22) remains parked. The old provider endpoint needs separately approved verified retirement; source HTML removal alone is not enough.
- Secrets are not supplied in any files, no `process.env` or fake “production configured” values. Future approved stage/prod secrets must be separately stored with least privilege and isolated identities. A stage key change fails closed until reviewed draining/migration runbook exists.
- Exact website origin, cross-origin CSP, first-party privacy disclosure, human keyboard/VoiceOver/200% zoom/error/fallback behavior and observable rate/denial limits remain a separate Indigo/Prism/Keel and Vesper final stage.
- **Do not merge, deploy, enable a preview URL, make provider calls, send email, spend, change DNS or publish before explicit founder choices and fresh independent architecture/operational reviews.** CI passing is not an operational GO.

## Read-only replication

```sh
node --check intake/stage2/provider-adapters.mjs
node --check intake/stage2/sql-coordinator.mjs
node --check intake/stage2/guarded-handler.mjs
node --check intake/stage2/cloudflare-worker.mjs
node --check intake/stage2/worker-entrypoint.mjs
node --test tests/site26-adapters.test.mjs tests/site26-sql.test.mjs tests/site26-handler.test.mjs tests/site26-worker.test.mjs
```

Source package needs Node 22 for experimental `node:sqlite` in *tests only*. No NPM dependencies, local .env, cloud account or network access is required.

## Explicit next gates

1. **Vesper Stage 2 code review at exact PR SHA:** inspect core parser/consent, ingress trust assumption, SQL transactional atomicity, replay and email ambiguity, bounded provider bodies/deadlines, secret/key rotation, stage off switch and CI evidence. Return PASS/CHANGES REQUIRED/BLOCK *for source under review*, not an implicit approval of cloud or production.
2. **Rook + Keel after independent guidance:** prove actual runtime in an explicitly approved isolated preview *after founder selects named vendors, costs and secrets*, including real crash/restart and multi-Worker contention; add real provider adapter and verified sender + Turnstile widget only within reviewed scope.
3. **Indigo/Prism then Vesper final release:** reviewed frontend integration, CORS/CSP/privacy, human accessibility, old endpoint retirement and externally verified anti-abuse policy; founder separately approves exact merge and public publication. Keep BAGDigital Core/HCP integrations out of this issue.

**Important:** Using GitHub for cross-role handoffs is not a way to run agent sessions automatically. Control Desk can implement and route source work, but independent Vesper remains separate.
