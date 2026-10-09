# Housecall Pro connection journey — standalone design reference

**Status:** NON-PUBLIC / SYNTHETIC / NO LIVE FUNCTIONALITY
**Issue:** [Site #9](https://github.com/BAG-Digital/bagdigital-site/issues/9)
**Related:** [Site #6](https://github.com/BAG-Digital/bagdigital-site/issues/6) / [Site PR #8](https://github.com/BAG-Digital/bagdigital-site/pull/8) — existing customer Home; [Core #97](https://github.com/BAG-Digital/bagdigital-core/issues/97) — M9 identity; [Core #84](https://github.com/BAG-Digital/bagdigital-core/issues/84) — HCP M4 evidence; [Infra #15](https://github.com/BAG-Digital/bagdigital-infrastructure/issues/15) — credential cutover gate.

## Why this exists

A useful customer portal needs to tell the customer *what's connected, what requires approval, and what happened*, without showing fake operational data. This concept demonstrates a **Connections → Housecall Pro** journey after the zero-connection Home designed in Site PR #8. It is a complementary **visual reference** for a future authenticated application, not another competing customer portal implementation.

Use the approved screenshot/layout and content states as visual requirements for Core's application team. Indigo owns the design proposal; Rook/Keel/Vesper own their normal implementation, infrastructure and security decisions. Do not integrate a provider credential in this site repo.

## View locally

After checking out this branch, open `.github/design-concepts/hcp-connection-journey.html` locally in a browser. It references only its adjacent CSS. It is intentionally disconnected from the public site and contains no JavaScript, links to external services, forms, buttons, provider requests or customer data.

Run:
```sh
node --test tests/hcp-connection-journey-contract.test.mjs
```

The dedicated GitHub Action runs the same source contract on PRs. A passing source test **does not** prove visual accessibility, authentic server authorization, protected credential handling or live HCP API availability. Check keyboard/focus, screen reader order, contrast and mobile widths before adopting the design into an authenticated app.

## Customer-facing information rule (founder directive, 2026-10-09)

**Show the customer only what they need to understand value, decide, act safely, or solve a problem.** The experience should be reassuring without explaining BAGDigital's internal architecture.

The rendered customer page should answer:
1. What is this? (Housecall Pro)
2. Is my business connected? (Not connected / Needs attention / Basic connection confirmed)
3. What can I do now? (Only genuinely available features and permitted actions)
4. What should I do next? (A specific, plain-English next step)

**Customer sees:** meaningful state, what data or actions they are approving, price/terms when relevant, timing/limitations that affect their decision, privacy/safety choices, and direct help.

**Customer never needs internal implementation details:** `GET /company`, OAuth/credentials, vault, tenant/RLS, AWS/Vercel, Red Team gates, milestones, PR/CI, webhook mechanics, internal agent names, or tech-stack comparisons. Store those details here in engineering notes and owning Core/Infrastructure repositories. Error messages should say what happened and what the customer can do, not disclose provider payloads or internals.

**Do not overcorrect into deception:** Show a truthful "Not available yet" instead of a pretend Connect button, explain consent and permissions before they take effect, and don't imply a successful company read enables jobs/estimates. A short preview-only disclaimer is necessary for this demo; it is not proposed production website copy.

`tests/hcp-connection-journey-contract.test.mjs` now enforces the absence of internal engineering terminology in rendered page source.

## Visual state taxonomy

The design's first card is **NOT CONNECTED** and is a synthetic default; the second is **NEEDS ATTENTION** (hypothetical blocked/pending state); the third is **BASIC CONNECTION / EXAMPLE** (hypothetical successful company-information check). None of these are fetched or validated. They deliberately do not represent a successfully completed Francisco connection, status from HCP, actual company record or active automation.

Future product behavior should take **server-derived** status only after authorized tenant/workspace selection, restricted Core persistence, approved vault access, and relevant red-team controls. Do not infer a customer connection from milestone labels.

Proposed presentation contract, **not an API or DB schema**:
- `provider_name`: static human-readable provider label, not a user-controlled endpoint
- `connection_readiness`: server-authorized `not_connected` / `needs_action` / `verification_pending` / `read_verified` / `restricted`; exact final statuses to be decided from actual Core source truth
- `verification`: safe status, checked-at timestamp only when actually verified, permission mode and documented verified capability list
- `next_action`: accurate human-readable resolution instructions drawn from approved server policy; no active action when gated
- `audit_summary`: only when real activity data exists and user has permission; no raw provider body or customer PII

**Important:** This is a UI discussion aid and must not become independent authorization logic or a hard-coded HCP credential lifecycle. The generic customer Connections area should ultimately render other providers using the same company/tenant model.

## Independent prerequisites for real functionality

1. Approved managed identity architecture; production sign-in, session, verified org/workspace membership, RLS read scope and secure logout/revocation ([Core #97](https://github.com/BAG-Digital/bagdigital-core/issues/97)).
2. AWS guardrail finding RT-M3-11 independently dispositioned and deployed with tested alerts; separate real credential cutover review and owner approval ([Infrastructure #15](https://github.com/BAG-Digital/bagdigital-infrastructure/issues/15)).
3. Narrow, approved read-only Housecall Pro first-read capability, verified healthy tenant-bound connection, exactly authorized `GET /company`, status-only evidence; no customer writes (Core #84).
4. Exact-commit security/UX tests for real implementation, product readiness evidence, publication release policy and explicit founder authorization.
5. Use a Next.js/Vercel server-side application and Core for sessions/connection state; **never** host authenticated private customer data or credential collection on GitHub Pages.

## Accidental publication limitations

This source lives under `.github/design-concepts/` so ordinary branch-based GitHub Pages/Jekyll excludes it by default. A `noindex` meta tag or hidden link does **not** provide access control. If `.nojekyll`, a custom Pages Action, or Pages source configuration changes, that exclusion may fail. Inspect the configured Pages build and verify the concept returns 404 before merging. Do not include confidential material even in hidden source.

## Scope and handoffs

- **Own branch and issue**: Site #9 only; does not edit existing PR #8 or public site.
- **Site PR #8**: existing zero-connection Home; its author controls that branch.
- **Core PR #98 / #108**: identity research/owner console; this visual design does not assert or modify their state.
- **HCP integration agent**: keeps ownership of credentials, HCP API and actual first read.
- **Prism**: editorial review of claims and clarity before any public release.
- **Vesper**: source and release security independent from author.
- **Jaime**: exact-SHA owner merge/release approval.

No new product milestone, automated publisher, paid plan, HCP permission or production change is authorized by this design.
