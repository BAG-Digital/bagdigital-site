# BAGDigital customer onboarding — launch-day experience

**Status:** SOURCE DESIGN PREVIEW ONLY — no production account creation, session, customer data, billing, provider connection or public release authorization.  
**Business purpose:** make onboarding genuinely self-service once Core M9 identity/membership, M10 repeatable onboarding and commercial contracts pass security/release acceptance.  
**Tracking:** [Site #6](https://github.com/BAG-Digital/bagdigital-site/issues/6), [Core M9 #97](https://github.com/BAG-Digital/bagdigital-core/issues/97), [Company #18](https://github.com/BAG-Digital/bagdigital-company/issues/18), [Company #26](https://github.com/BAG-Digital/bagdigital-company/issues/26).  
**Prototype:** `.github/design-concepts/customer-onboarding.html` (open locally). `noindex` is not access control; do not assume unpublished resources are private if eventually placed under a public site build.

## Customer experience (target production contract)

| Stage | Customer sees | Server must prove before proceeding |
| --- | --- | --- |
| Enter BAGDigital | **Create account** and **Log in** using managed, reviewed identity; accessible recovery | Stable verified identity, defended sessions/rate limits, not a fake static form |
| Your business | **Set up a business** or **Join your team** via valid invite | Active membership/authorized org/workspace; invitation verified, no domain/email/name autojoin |
| Your priorities | Plain-language outcome choice: **Follow-ups**, **Daily view**, **Reduce double entry** | Persist only authorized preference; no automation activation or provider access from choice |
| Your workspace | Business name, genuine plan/status, **0 connected**, **0 running**, clear next available action | Server-derived account, membership, subscription, connection and capability state; no synthetic counts |
| Return later | Verified user logs out and returns to the same workspace | Secure session lifecycle; server-side membership changes/revocation take effect; never trust browser-selected org ID |

Small-screen UX: headline and brief orientation, clear step counter, one main next action, back action, on-screen focus moved to new step, no secret entry into public marketing site, readable connection/approval state.

**Plain-language UI copy:**
- Hero: *Make room for better work.*
- Step 1: *First, let's get to know you.*
- Step 2: *Where does your team work?*
- Step 3: *What would help most?*
- Step 4: *Here's where you'll begin.*
- Externally facing site: only show **Create account** when actual reviewed signup/login has been verified in production. Otherwise use **Request access** with truthful enrollment explanation, provided an approved provider-backed safe inquiry path exists.

## Verified release boundary (as of 2026-10-09)

Core M9 [Phase 0 PR #98](https://github.com/BAG-Digital/bagdigital-core/pull/98) documents identity/security requirements and vendor evaluation only; its source explicitly says production signup/login is not implemented or authorized. The publicly served `bagdigital.tech` marketing site is static GitHub Pages. A candidate application hostname is **not evidence of a live service**.

**Do not publish "Sign up" or "Log in" calls to an unimplemented route, forward customers to a fake app, ask for passwords via FormSubmit, use unapproved hosted-auth credentials or claim onboarding completed.** A registration interest form is different from account signup.

The customer-facing journey is the same for Francisco and every other business. Francisco's unique $0 Design Partner commercial entitlement is granted **only after** founder-approved server-side verified organization mapping, never by public plan selector, company name/email domain match, coupon or client-field. Other organizations must see truthful plan terms and verified billing status; **no unapproved publicly selectable free plan** or fake paid checkout.

## Minimal Core integration handoff

1. Confirm and approve managed identity architecture ADR with independent Red Team (Core #97/#25). Vendor-specific signup UI/SDK stays server-side/auth boundary; static site only links to reviewed production route.
2. Provision a reviewed Vercel/Core app with dedicated production hostname and auth redirect allowlist; demonstrate real verification, HttpOnly secure session and logout/expiration/recovery behavior.
3. Authorize Create/Join against server-enforced active membership/org/workspace scope and persistence. Test Org A → Org B cross-tenant attempts, replayed invitations and status-revocation.
4. From Core's authorized read model show accurate plan and `NOT CONNECTED` provider states. Do not show a working automation when provider permissions/capabilities are unverified.
5. Persist priority preferences only after membership authorization. No provider connection, customer messaging, subscription grant or payment merely from UI selection.
6. Verify two independent organizations through same path. Francisco's complimentary entitlement requires separate owner-approved audited server-side assignment. Customer #2 must never inherit it.
7. Independent exact-SHA security PASS, deployment/runtime evidence, founder production release approval and rollback criteria **before** public `Create account` button is activated.

### Minimum acceptance matrix

- Anonymous access to a business workspace denied.
- Email verified; password/MFA/recovery owned by approved identity provider.
- New business creates appropriate org/workspace/membership once; refresh and logout/login restore correct state.
- Joins require valid invitation, role check and status; no arbitrary org join.
- Revoked membership loses access even with old tab/session/token.
- Two independent businesses cannot see each other's records, preferences, plan or invite.
- Subscription is server-owned and cannot be changed via fake client field.
- With zero connected providers UI shows 0, never stale/fake data; automations unavailable.
- Mobile widths 320/375/768/1440, keyboard focus, screen-reader landmark/control names and 200% zoom pass manual review.
- Consent/privacy/terms/price provided at the appropriate stage; communications and access require explicit permission.

### Launch modes (do not confuse)

**A. Real account signup:** publish only after the above checks and approval. “Create account” genuinely verifies users, persists authorized membership, and restores a session on return.

**B. Limited release / request access:** if real account infrastructure is not ready, use truthful “Request access” rather than “Sign up”. Collect minimal contact details **only through an approved, verified server-side anti-spam/privacy-handled intake**. Existing Site #7/PR #5 FormSubmit live gate is not yet independently closed; do not claim that route is ready. Do not request credentials or sensitive business details on public intake.

Neither mode should imply that HCP, Google, messaging or automations are live. There is no requirement to activate integrations or paid checkout simply to ship a truthful zero-connection authenticated workspace once reviewed.

## Current preview scope and review

This PR includes a **clickable synthetic flow** with example org/create or join choice and outcome preferences, but **no editable user input, auth, API, network calls, persistent state, actual organization, entitlement or provider connection**. Browsers cannot create an account through this file.

- `node --test tests/customer-onboarding-design.test.mjs`
- `node tests/customer-onboarding-browser.mjs` — requires Node 24+, Chrome/Chromium; launches loopback-only fixture, tests step navigation, scenario branches, reset and zero-connection sample state. Generated synthetic screenshot artifacts for owner review.
- No navigation links from the public site, no Core or other agent code changes.

**Review:** founder-designated editorial/UX and independent security. Inspect exact SHA, full diff, browser screenshots, mobile and keyboard behavior, claims, action affordances, consent, backend contract, release warnings. PR is draft until approved. No published signup through this preview.
