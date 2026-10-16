# Site #23: offline mock-only protected inquiry contract

**Status:** Stage 1 synthetic test model. NOT a public API, protected website, host adapter, server/worker, account setup, delivery service or deployable product. It does not alter the existing static site or its FormSubmit endpoint. It deliberately requires `mockOnly: true` and mock-stage/fake credentials. **Do not deploy this module.**

## Review gates and references

- Architecture: [Site draft PR #24](https://github.com/BAG-Digital/bagdigital-site/pull/24), independently **PASS WITH CONDITIONS for entry to Stage 1 only** at immutable SHA `af518c4974204dd9887a92eef640ae8ac9b7e6d5`, later presentation-only diagram corrected at `d8ca2d9c4bbf6379089e3e8aa46dec8cb7733921`. Vesper must review the diagram revision's exact SHA before final design acceptance.
- Implementation evidence: this **separate PR**, no production release. Site #23 and Site #7 RT-WEB-01 remain open.
- Keel: [Infrastructure #29](https://github.com/BAG-Digital/bagdigital-infrastructure/issues/29); proposed (not authorized) Cloudflare Worker + one SQLite Durable Object *per stage* + mandatory server-side Turnstile Siteverify + fixed verified email relay. Alternative isolated Vercel + transactional store.
- Security independence: new exact-SHA Vesper implementation review required after mock tests. Founder separately decides vendor, cost ceiling, accounts, staging, release and legacy endpoint retirement.

## Run without a provider or local server

From repository root on Node 20+:

```bash
node --test tests/site23-mock.test.mjs
```

The test adapter and synthetic data use `example.invalid`, a fake synthetic source, and no external provider. The expanded Stage 1 suite exercises **30** offline contract cases including owner CAS, handler clock divergence, verifier timeout, expired lease cleanup, duplicate JSON members and correct 413 responses. A GitHub Actions workflow executes the same tests when the draft PR is opened or updated. There is no runtime secrets file, HTTP listener, worker entrypoint, provider SDK or sending capability in this repository change.

## Contracts being exercised

1. Input validation happens before store access, Siteverify, or sender calls: bounded **16 KiB** UTF-8 body, fatal invalid-byte decoding, duplicate JSON member-name detection after escaped-key decoding **before** object construction, Unicode NFC and codepoint/byte length caps, strict flat string-only schema, consent, fixed services, no recipient override, nontrusted Origin and header injection checks.
2. One shared, synchronous fake atomic admission operation accepts all of source + global budgets, verifier concurrency, source key cardinality, stage token-digest-only PENDING claim. A cross-instance mock shares the same fake store; single-flight CAPTCHA token replay denies the second call even when message and request ID change. **The fake store is the sole time authority** for rate windows, verifier lease deadlines, tombstones, logical dedupe expiration and cleanup; intentionally divergent handler clocks are regression tested. Lease completion and delivery-state updates use owner-scoped conditional transitions, with terminal state protection. Synthetic failure switches model outage and pre-commit transaction abort. **This does not prove a real distributed database is serializable or durable.**
3. Siteverify is **an injected fake only**. Validate strict numeric timestamp, typed hostname/action/success, an 8-KiB UTF-8 response cap and 300-second challenge age. A bounded mock verification deadline can be triggered deterministically; a 5-second fake-store verifier lease expires without releasing a 15-minute token replay tombstone. The fake store explicitly sweeps expired permits and eventually removes expired token/logical records. No retry on a potentially consumed token.
4. Independently HMAC-derive a logical delivery identity from canonical form content, excluding request ID, CAPTCHA token and sender IP. Reserve it before one fake email attempt; retain a proposed 24-hour RESERVED/SENDING/ACCEPTED/FAILED/UNKNOWN state. A fresh CAPTCHA token plus same normalized inquiry cannot silently deliver twice within that window. On ambiguous timeout, explicitly say the message **might** already be sent and provide direct-email fallback in future UI.
5. No global or per-request handler uses `fetch`, an email SDK, filesystem, actual network or environment credentials. Tests count every fake verifier/email call; logs are synthetic, redacted events only.

## Honest limitations

- `FakeAtomicStore` is an **in-memory single-process mock**. Its synchronous `admit` models a transaction only for deterministic tests; it does not constitute real multi-instance persistent, ACID, recovery, HMAC migration, consensus, or rate-service verification. Multiple synthetic handler instances share one fake for the test. Keel and Vesper must verify a real one-stage/one-Durable-Object or other truly atomic host/store independently.
- The strict JSON decoder accepts **flat string-valued JSON only** on purpose; it enforces the four legal structural JSON whitespace characters, strict UTF-8 and duplicate aliases. Overlong bodies return 413. The parser, Unicode edge cases and streaming cap still need independent review. No host ingress source can be trusted merely because a caller passes a parameter: a production edge adapter with verified provenance is entirely absent.
- The mock verifier has a bounded **simulated** 3-second deadline, an injected deterministic timeout signal, strict response-type checks and an 8-KiB UTF-8 result limit; there is **no real provider HTTP adapter**, actual response-stream cap, server-side secret or Turnstile API. The fake shared store has authoritative time and CAS/lease-expiration semantics, but not real crash-safe distributed persistence. Real integration cannot start without separately authorized isolated staging and exact-SHA review.
- The mock sender has no SMTP/API client, domain authorization or end-to-end delivery receipt; sender acceptance does **not** guarantee inbox receipt. Catching a mock throw simulates unknown delivery, not a real provider guarantee. The test holds a mock sender promise at the `SENDING` boundary while exercising a second independent handler; this illustrates the crash window but does **not** simulate physical process restart or implement durable recovery.
- The sample 24-hour content-HMAC key can suppress intentionally repeated identical legitimate messages; changed content or post-TTL retries can send another message. This availability/retention tradeoff is **reviewed for mock design only**, not approved for real customer privacy/product use.
- The test-only module is **not** hardened against all untrusted network resource exhaustion; edge WAF/rate controls, provider budgets, verifier execution deadline, verified sender identity, secret custody, live cost alerts and emergency kill switch remain ARCH24-05 release gates.
- The current published FormSubmit intake under Site #7 is still live. **Do not switch the webpage, retire the provider endpoint, merge, publish or send email based on green mock tests.**

## Future, separately authorized

After Vesper reviews this exact Stage 1 source SHA and Keel completes host feasibility, the founder may decide on a named isolated host/store/challenge/relay configuration, operating ceiling and enrollment. Only then can a separate, independently reviewed non-production adapter/staging track begin. Architecture approval and mock CI are not approvals to handle real user messages.
