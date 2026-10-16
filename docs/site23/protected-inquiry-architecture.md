# Site #23 — Protected public inquiry: Stage 0 architecture and threat model

**Status:** PROPOSED, ARCHITECTURE REVIEW ONLY (2026-10-16). This is not approval of hosting, providers, credentials, a mock implementation, a released endpoint, or source merge. Rook owns the engineering design; independent Vesper owns the architecture/security verdict; Keel owns hosting/secret/reliability feasibility. Founder approval is required before provider enrollment, spend, staging, production changes, source merge and release.

**Context and immutability:** Site #23; security issue #7; Site PR #21 exact reviewed form baseline a7b8eea8a1b767d1001222063b62eb1208e7109d (OPEN/UNMERGED); parked Site PR #22 exact 21c86072e8e03c96986ad76d7ba7c443ba34c0f2 (DRAFT/UNMERGED); public site on GitHub Pages main e32a7f65957ee3f1eb63ccc65a71b1bdc9015844. Never modify those refs as part of this Stage 0 design. The old live third-party FormSubmit endpoint remains active and is a separate risk; removing form HTML will not revoke it.

## Goal and security boundary

BAGDigital needs **one small, first-party marketing inquiry**, independent from Core tenant credentials, Francisco's HCP connection, Google OAuth, customer authentication, agents, and payments. GitHub Pages can serve the visual form but cannot enforce a trusted submission policy. The selected light Field Notes design stays intact until a separately reviewed UI cutover.

Architecture, with topology/provider selections **proposed, not enrolled or deployed**:

    Visitor browser (untrusted)
       | HTTPS fetch, explicit form acknowledgment, anti-bot widget
       v
    Static bagdigital.tech (GitHub Pages: cannot securely validate itself)
       | POST application/json; explicit credential-free HTTPS request
       v
    NEW, ISOLATED marketing intake service (host/domain TBD, OFF by default)
       | 1. Kill switch, method/type/body cap and allowlisted Origin hint
       | 2. Server-owned schema/consent normalization, no extras
       | 3. SHARED durable abuse quota acquisition, fail closed
       | 4. Server-to-server challenge verification and expected host/action
       | 5. Durable token/replay + submission idempotency reservation
       | 6. Fixed sender/recipient, structured text-only email delivery
       v
    Approved outbound email relay (provider TBD) --> fixed BAGDigital inbox

    Separately: aggregate redacted status/abuse metrics, bounded alarms and rollback.
    NO direct form POST to FormSubmit; NO customer Core APIs or database access.

The email relay and limiter are independent adapters. The deployment must not load tenant/provider keys or a Core database credential. Use no customer account cookies. One controlled public endpoint only; staging/prod keys, email sandboxes, durable stores, alert routes, quotas and off-switches are separately isolated. No shared staging secrets or production receiver.

## Public contract (proposed, subject to independent review)

- HTTP POST only; reject other methods with 405 and a constant Allow: POST. Reject unsupported Content-Type with 415. JSON only, UTF-8, strict body limit **16 KiB** enforced while reading a bounded stream; reject oversized Content-Length and streamed bodies. Parse JSON only after the cap; reject duplicate JSON keys (or use a parser that surfaces duplicates), arrays, scalar input, pollution keys, unknown keys, unexpected nested structures and ambiguous encodings. Reject invalid JSON with 400.
- Exact allowlist: name (1–100 characters), email (valid bounded mailbox format, maximum 254 characters), optional business (0–100), service (one enumerated website/workflow-planning/integration-planning/support selection), message (20–2,000), processing_ack exactly string "yes", challenge token (1–2,048; mandatory), request_id (UUIDv4; caller-supplied only as a dedupe hint, never as authorization). Trim, normalize where defined, reject control characters and CR/LF in header-bound values; no HTML accepted as trusted content. Keep response errors generic and field-specific only when safe; never echo message bodies. Do not infer genuine informed consent solely from caller-supplied processing_ack; server checks its presence/value and visitor wording/consent remains independent UX/legal scope.
- Only configured public site origin(s) may use browser CORS, and reject inconsistent Origin where present; allow OPTIONS narrowly for preflight if required. **Origin, Referer, CORS, client IP and client-supplied challenge result are never authentication or CAPTCHA proofs**; non-browser direct requests remain explicitly in scope. Do not allow credentials, wildcard origins or browser-exposed secrets. CSP and script/processor disclosures change only after Indigo/Prism acceptance.
- Server config must contain nonempty allowed hostnames, expected Turnstile action, fixed sender and fixed BAGDigital recipient, stage-specific challenge secret, approved rate-store credentials, approved sender credential, plus enabled flag. **Default disabled; fail closed on missing, malformed, or test-only credentials in production.** Provider URLs and email destination are constants/configuration; never accept recipient, relay URL, From or HTML template from request.
- Source address derives exclusively from a host-verified proxy chain, not arbitrary X-Forwarded-For. Where attribution cannot be trusted, use conservative global quota or reject. Pseudonymize rate keys with a rotating server-only HMAC secret and TTL; never write raw IP, email, body or CAPTCHA token to telemetry.
- Rate limits need an **atomic, shared/durable** per-source and global budget, including request/concurrency caps and expiration. Reject excess with 429; **reject with 503 without sending** when the service is down, read is stale, writes are not atomic, or budget cannot be evaluated. No global Map/in-memory counter. Keel chooses and verifies actual store/service and abuse/cost budgets before deployment. Pre-challenge budget protects the verifier from request floods.
- Cloudflare Turnstile is a **candidate**. The server must call Siteverify with the server-only secret for EVERY otherwise valid attempted submission; require success, allowed hostname for current environment, exact action "marketing_inquiry", a valid challenge timestamp in the window, and provider's single-use property. Reject absent, malformed, timed-out, duplicate/replayed, expired, wrong host/action and ambiguous responses without email. Each production stage has non-test credentials and explicit hostname allowlist. Turnstile's vendor docs say tokens expire in 300 seconds and are single-use; evaluate a durable token digest reservation to stop concurrent replay attempts and correlate failures, never store raw tokens. Siteverify network timeout/5xx/unparseable responses fail closed. Avoid retries that might double-redeem. Vendor testing keys are **for offline/mock or isolated test only**, forbidden in production.
- If CAPTCHA succeeds, perform **atomic durable idempotency reservation** BEFORE any delivery. Key derives from server-HMAC over verified token digest plus submitted request_id and normalized bounded input fingerprint, with TTL; reject repeats/in-flight; one approved email send attempt. Reserving before email can produce a lost inquiry on relay failure: return a safe failure plus explicit fallback email, with no automatic blind retry. This is at-most-one send attempt, **not guaranteed exactly-once email arrival**. Exactly-once delivery requires a separately reviewed transactional outbox and PIΙ retention policy, intentionally out of scope.
- Email transport uses approved server-owned provider endpoint and least-privilege key. Fixed BAGDigital inbox and a verified BAGDigital sender address only; user's email may be a strictly validated Reply-To or part of text body, never outbound From/to/bcc. Use provider JSON structure and a text-only template; ensure CRLF injection and HTML markup cannot alter headers or routing. Set short request timeouts. On transport 4xx/5xx/timeout, return generic delivery failure (do not leak relay response), never log message or retry automatically.
- Success is only a **verified relay-accepted** response; explain that inbox delivery is not guaranteed. Generic errors preserve page draft and provide manual contact fallback. Protect from browser multiple-clicks without claiming this is a security control. All responses use no-store, nosniff and appropriate security headers. Required browser script, captcha iframe and extra domains require independent UX/Prism/CSP review.
- Minimal telemetry: bounded timestamp, random request correlation ID, validation category, limiter outcome, Siteverify category, relay accepted/failure, latency bucket and on/off state. No raw request payload, recipient query string, names, email, full IP, captcha token, secret, stack trace or vendor payload. Rotate/expire pseudonymous abuse keys; decide metrics retention with Mara/Keel/Vesper. Kill switch can stop all submissions without losing website availability. A public form must never fall back to less protected FormSubmit when service is unavailable.

## Failure and abuse cases to independently review

| Attack/failure | Enforcement | Expected no-delivery result |
| --- | --- | --- |
| Direct forged POST, missing consent, false or arbitrary consent | strict backend schema, processing_ack == "yes" | 400; sender not invoked |
| Caller supplies recipient, action, _captcha=false or unexpected data | exact schema allowlist and fixed transport config | 400; sender not invoked |
| Missing/invalid/expired/replayed Turnstile token | mandatory Siteverify + host/action checks, token reservation | 403; sender not invoked |
| Siteverify reports different hostname/action or stale challenge | exact environment binding and timestamp | 403; sender not invoked |
| Siteverify timeout/5xx/malformed response | fail-closed dependency error | 503; sender not invoked |
| Overlong body, field, malformed JSON, duplicate keys or wrong MIME | strict max streaming size/parser/schema | 400/413/415; no Siteverify or sender |
| OPTIONS or GET abused | narrow CORS preflight; disallow unsupported methods | 204 for permitted preflight or 405 |
| Spoofed Origin or client IP | hints only; trusted edge attribution | never bypass quotas/verification |
| Per-source/global overlimit; limiter unavailable | atomic durable quotas, fail closed | 429/503; no sender |
| Double click / concurrent replay / request_id reuse | single-use challenge and atomic reservation | at most one send attempt |
| Email relay timeout, provider failure or missing key | bounded dependency with no blind retry | 502/503 and safe fallback |
| Source site/host absent, disabled config or server kill switch | fail-closed startup/request guard | 503; no request to vendors |

## Stage 1, after Vesper architecture disposition: isolated synthetic implementation contract

Implement **only after** Vesper's independent architecture verdict and relevant remediation. Source path suggestion: "intake/" in an isolated PR branched from site main; no site-form wiring until Stage 2 and no deployment adapter selected yet.

Runtime: minimal Node Web Request/Response pure handler, injected dependencies { challengeVerifier, durableLimiter, replayStore, emailSender, clock, redactedLogger, config }. A thin host adapter is postponed until Keel supplies verified hosting scope. No production env files, import of Core, dependency on customer DB, live API calls or active entrypoint in GitHub Pages. Build an offline mock that counts every dependency invocation and verifies **ordering and zero sends**.

Required deterministic CI tests, at minimum:
1. Valid fictitious case + verified challenge + available quotas => exactly ONE mocked sender call to fixed recipient and bounded success response.
2. Missing consent; consent != "yes"; invalid email; missing name/service/message; empty token; extra _captcha=false or recipient; forged action; unknown fields => no verifier/no sender.
3. Unsupported method, origin/preflight mismatch, MIME, scalar JSON, duplicated JSON keys, invalid control chars, oversize body and streamed Content-Length bypass => no verifier/no sender.
4. Challenge null/error, provider expired/duplicate, wrong hostname/action, old timestamp, verifier timeout/unavailable, replayed/concurrent token => no sender, fail-closed status.
5. Durable per-source/global throttle exceeded, unavailable or non-atomic adapter; untrusted X-Forwarded-For; disabled flag, missing secrets, stage/test-key misconfiguration => no sender; no fallback to in-memory limiter.
6. Caller-supplied From/To or Reply-To CRLF, malicious HTML, request-id collision, double send, relay rejection/timeout => fixed routing, text-only escaping, no PII in logs, no automatic retry.
7. Assert exactly zero network, filesystem persistence, live provider calls, secrets, HCP/Google or customer data in mocks; all errors do not log payloads; hidden public entrypoint disabled.

Vesper must additionally review any real host adapter/secret/cost configuration and re-run fail-closed tests against actual isolated staging before public availability. GitHub CI green and mock tests **will not** prove WAF, durable operational limits, provider availability, Turnstile production behavior or successful public email delivery.

## Open decisions / sequencing

1. **Vesper architecture verdict first:** inspect anti-bot response trust, replay/atomicity, quota/cost failure, idempotent send semantics, malicious fields, minimal PII and safe off-switch. Return PASS / CHANGES REQUIRED / BLOCK with this exact reviewed artifact SHA; no source merge implied.
2. **Keel read-only hosting packet via Infrastructure #29:** compare provider-host options, verify actual authorized tenant/project IDs, cost and free-tier risks, secrets and separate staging/prod, WAF, shared rate store, email relay, monitoring, rollback, and approved allowed origins. No resources or vendor accounts are authorized by this document.
3. **Rook after review:** implement the mockable no-network source and CI on a **separate reviewed source PR**, then get Vesper exact-SHA implementation verdict; Indigo/Prism separately accept real in-page consent/privacy/challenge UI; founder separately approves vendors/spend, nonprod testing, merge, production release and old tokenized FormSubmit endpoint retirement. Never change PR #21/#22 or public main before these gates.

## Authoritative reference material

- Site #23 and Site #7; Founder decision Site #7 comment 6221500587; Rook+Vesper handoff Site #23 comment 6221521569; Keel Infrastructure #29.
- Cloudflare Turnstile server-side validation: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Cloudflare Turnstile testing keys: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
- Cloudflare Turnstile challenge lifecycle: https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
- Hosting candidates for Keel to evaluate only: https://vercel.com/docs/functions ; https://developers.cloudflare.com/workers/
