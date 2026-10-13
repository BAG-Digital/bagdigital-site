# Independent review handoff — customer workspace design branch
Status: REQUEST PREPARATION ONLY. No Vesper review has been performed or approved by this document.

## Scope
Draft Site PR #17, current head SHA must be freshly retrieved at review time.
Includes synthetic homepage, customer workspace, founder console, shared tokens, client-side navigation and synthetic state models, plus design contract tests.

## Current threat boundaries
- No customer login, no authenticated tenant membership, no server-side permissions.
- No provider requests, no provider tokens, no customer data and no live approval execution.
- Browser view models and UI guards are NOT security controls.
- Static prototype files are in .github/design-concepts, not deployed or linked from the public homepage.
- GitHub Pages publishing behavior and any accidental artifact exposure require verification before merge.

## Rook pre-review checklist
1. Confirm test execution and browser behavior (mobile, keyboard, zoom, screen reader) with captured results, not just committed test source.
2. Confirm no external network requests, unsafe script sinks, persistence or secrets.
3. Confirm Core production API contract, identity, RLS, tenant binding and audit requirements before any production adapter work.
4. Confirm no static public route exposes customer portal as if it were authenticated.
5. Check relevant AGENTS.md, SECURITY.md and current governance before implementation/release.

## Vesper review trigger
Independent Vesper review is required BEFORE:
- introducing authenticated portal access, provider-backed Core API calls or real tenant data;
- adding customer approvals that execute actions, connection enrollment or credentials;
- merging/deploying any security-sensitive or public-facing implementation requiring security signoff.
At that point, request exact-SHA review of diff, tests, dependency graph, data flows, role/tenant boundaries, failure modes and rollback. A prior PASS does not transfer to a new SHA.

## Separate HCP gate
Core #84, Company #33, Infrastructure #15 are open at drafting. No HCP cutover or claim of live readiness. HCP key existence does not imply connected/healthy.

## Other reviews
Indigo: responsive visual and accessibility acceptance.
Prism: public copy, claims and consent.
Rook: implementation tests, API contract.
Founder: explicit release/merge authorization after required reviews.

## Decision
Design iteration can continue on isolated branch. Do not request a production-security PASS based on synthetic previews alone; schedule Vesper at the first real trust-boundary change and before release.
