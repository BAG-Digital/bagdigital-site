# BAGDigital Site — Agent Operating & Live Business Context Rules

**Scope:** Website, sales demonstrations, editorial drafts, accessibility, design assets, and public-intake website work. This document proposes repository-local guidance for on-demand web/design specialists (including Indigo). It does **not** authorize publishing or change customer portal/Core/infrastructure ownership.

## Required current-business refresh

When invoked on a new task, asked to **continue**, or preparing a material public claim/change:

1. Read the latest **approved** BAGDigital strategy/customer positioning, pricing/offer decisions and current source-backed product status from `BAG-Digital/bagdigital-company`. The proposed common recovery standard is `company/agents/LIVE-BUSINESS-REFRESH.md` in Company PR #39 (stacked on PR #38 until approval); do not treat an unmerged policy as active.
2. Read live Site issue/PR/branch ownership, the **exact current head SHA**, current CI/review comments, live hosting and previous release evidence. Check Core/Infrastructure only for claims involving actual deployed features or connection status.
3. Distinguish `VERIFIED PUBLIC/USABLE`, `IN DEVELOPMENT`, `DEMO/PROPOSED`, `BLOCKED` and `UNKNOWN`. A static mock, noindex prototype, green contract tests or a design-agent handoff is not a working HCP connector, production customer portal or independently approved release.
4. Check review and owner gates before changing publication routes, contact forms, privacy/security wording, live DNS/Pages deployment, credentials or provider interactions. Ask the real implementation owner for evidence rather than assuming capability from marketing claims.
5. Make only a small owned, tested change on a separate branch/PR. Before an exact-SHA review or merge, re-fetch relevant current evidence. If another agent owns the PR/branch, coordinate a handoff instead of silently editing it.
6. Record a meaningful `as-of` checkpoint: issue/PR/SHA, what was verified/changed, tested vs not tested, owner and current blocker. Durable prompt updates need reviewed PRs; do not claim other ChatGPT sessions learned automatically or that a background agent is running.

## Customer-facing information standard (founder direction)

**Customers should see only information needed to understand the problem, the proposed benefit, honest availability, cost/terms, privacy/consent and next useful action.** Do not expose GitHub/AWS, endpoints, CI/PRs, internal security gates, agents or architecture diagrams merely to sound technical. Do not hide important limitations or claim an unlaunched integration, demo or proposed automation is available.

Use plain language, distinctive original branding, accessible design and verified proof; never invent testimonials, outcome metrics, software partnerships or production screenshots. Customer portal material belongs in an authenticated Core-controlled application when actually approved; no fake signup or credential collection on static GitHub Pages.

## Separation of current site work (verify live status each time)

- Site #7 / PR #5: public FormSubmit anti-spam/privacy security remediation with independent provider-live release gate. Do not bypass its specific verified controls or alter provider behavior without review.
- Site #11 / PR #12: customer-first homepage draft, stacked on the form security PR. Do not casually merge an open stacked PR into its feature-branch base.
- Site #6 / PR #8 and Site #9 / PR #10: non-public customer portal UI studies; no real login/provider connection.
- Site #13 / PR #14: **synthetic interactive** service/marketing workflow demo; tests prove simulation, not active integrations, and public publication is a separate explicit decision.

These are retrieval pointers from October 2026, **not evergreen status assertions**. Every agent must recheck live issue/PR state and deployment evidence before asserting they remain open/blocked/merged.

## Working with other roles

- Rook owns engineering coordination and authentic app/Core workflows; Keel owns infrastructure.
- Mara/founder approves company positioning and commercial commitments.
- Prism independently checks proposed public claims and branding at the exact artifact revision when required.
- Vesper independently reviews material security/privacy/abuse risks; ordinary CI never substitutes for independent clearance.
- Jaime alone provides the final owner approval required for merges and actual public release.

GitHub issue/PR handoffs are durable notes; they do **not** wake independent agent sessions. Never impersonate or self-approve another role's review.

## Release rules

Issue → bounded branch → actual tests and clear evidence → independent review when required → explicit founder merge/publish decision → live verification. Do not push material changes directly to `main` merely because branch protection is absent. Credentials, tenant data, raw customer inquiries, private provider payloads and live account records do not belong in demo/source assets.

This file does not install automations, mutate ChatGPT Project/custom GPT prompts, grant permissions or affect a working deployment. For active role prompts in configured ChatGPT sessions, the user must separately apply approved startup guidance.
