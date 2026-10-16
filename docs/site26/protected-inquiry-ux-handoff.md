# Site #26 — protected inquiry UX handoff (OFFLINE only)

**Candidate:** separate child branch based on founder-selected [Site PR #21](https://github.com/BAG-Digital/bagdigital-site/pull/21) exact `a7b8eea8a1b767d1001222063b62eb1208e7109d`. **No root webpage, CSS, CSP, FormSubmit HTML, live provider configuration, domains, DNS or public website has been changed in this draft.** Child PR must never be merged into main by itself; backend+frontend cutover needs review and separate approval.

**Owners:** Indigo accessibility/UX, Rook response contract, Prism processor copy, Mara business correspondence; independent Vesper re-reviews assembled exact front/backend release SHA. GitHub comments do not invoke separate agents.

## Code delivered

- `intake/ui/contact-controller.mjs` exposes `validateInquiryDraft`, `describeInquiryResult` and `attachProtectedInquiry`.
- Maps four approved visual site service labels to the four Stage 2 backend enum identifiers. Rejects client omission of name/email/message/consent, controls, invalid email and oversized fields before any injected request.
- Uses injected submit/token/UUID adapters; **no network URL, provider key, fetch call, native FormSubmit fallback or client-owned recipient**. The controller refuses to attach unless a future independently reviewed page sets `data-first-party-ready=true`, removes old FormSubmit form action and provides explicit capabilities. It is **not imported on the current page**.
- Native form and status region must be declared by final UI integration. The source controller prevents the default submission when wired correctly, announces server output, preserves unsent draft when validation/transport fails, focuses the first invalid control, resets on `202 RELAY_ACCEPTED` only, and makes **one submission attempt** without retries. 409/502 ambiguous outcome tells users not to repeatedly resend and to use direct email.
- Source-only tests cover server result semantics, selected label mapping, field validation, status changes, focus, rejected script misconfiguration and no-send-on-bad-challenge. These are Node synthetic tests, not real browser/screen-reader/Turnstile.

## Open requirements, not cosmetic

1. **Selected website/backend service mismatch:** Site PR #21 still presents `Not sure yet`; Stage 2 backend supports only `website`, `workflow-planning`, `integration-planning` and `support`. Current draft rejects `Not sure yet` rather than silently mislabel a customer's request. Indigo/Prism and Rook must choose either a separately security-reviewed `unsure` backend enum or remove/reword the option in a later exact-SHA frontend. Never pretend mapping is solved by these controller tests.
2. **Backend host/origin unknown:** Vesper's [Stage 2 PR #27 source PASS WITH CONDITIONS](https://github.com/BAG-Digital/bagdigital-site/pull/27#pullrequestreview-5553810464) did not enable a hosted endpoint. Actual site `connect-src` and `script-src` CSP cannot be safely authored until Keel confirms exact ingress hostname/sitekey and Vesper independently reviews routing. Do not invent hostname or use `connect-src *`, `unsafe-inline`, or browser-exposed Turnstile secret.
3. **Privacy processor undecided:** Final first-party notice must **replace FormSubmit-only wording** with truthful chosen Turnstile and outbound email processor handling/retention **after** founder vendor acceptance and Prism independent approval. The current public and selected PR #21 FormSubmit disclosures are not fit for a switched processor.
4. **Accessibility:** Visible status element should have `role="status"`, `aria-live="polite"`, initial help and error summary appropriately connected to inputs; form should keep labels, keyboard focus and fallback email. Verify with human VoiceOver or NVDA at 200% page zoom, narrow viewport, expired/failed challenge, backend 429/503 and ambiguous outcomes. No synthetic Node test proves spoken messages or end-to-end CAPTCHA interaction.
5. **Resend/dedupe semantics:** `202 RELAY_ACCEPTED` means relay accepted, **not delivery to an actual mailbox**. When backend returns UNKNOWN, do not automatically resend with fresh token; staff must investigate delivery through approved provider records without duplicating a customer inquiry.
6. **Source safety:** Enabling JS without replacing the native FormSubmit `action` would make a fallback submission unsafe. The future reviewed commit must remove FormSubmit action and test no uncontrolled POST even if JS fails; if configuration missing, display a truthful disabled form + direct contact fallback rather than silently invoking old vendor.

## Required next tested milestone

Rook+Indigo finish **integrated** native HTML form bound to a real, approved stage hostname, stage Turnstile widget and secretless public sitekey; submit no more than reviewed JSON to an actual, independent Vesper-approved server endpoint. Keel verifies trusted ingress, actual DO persistence, relay identity and WAF/cost. Prism approves real processor/privacy wording. Vesper reviews new exact source+operational SHA. Founder separately authorizes provider setup, staging, merge and public release; only then retire the *old* FormSubmit endpoint in a specifically authorized provider action.

**NO LIVE FORM / DEPLOYMENT GO from this source-only UX packet.**
