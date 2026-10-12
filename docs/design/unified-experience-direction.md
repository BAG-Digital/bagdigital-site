# BAGDigital unified experience direction — design proposal
Status: PROPOSED, non-public, design-only. Owner direction approved 2026-10-12. No publication, deployment, or merge authorization implied.

## Creative thesis
Independent systems studio: industrial counterculture with restrained borosilicate-glass materiality and skate-editorial confidence. Never imitate Thrasher or Volcom logos/trade dress. Business comprehension and trust outweigh decorative novelty.

## Audiences and journeys
1. Public prospect: recognize disconnected tools / repetitive work -> see credible *possible* workflow example -> discuss one workflow. Never imply an unverified connector is live.
2. Customer: secure sign-in (future Core M9) -> business workspace -> connections with truthful status -> pending approvals -> activity/audit -> help.
3. Founder: authenticated cross-organization operations (future verified role boundaries) -> tenant-scoped summary -> attention queue -> connection health -> approvals / support -> internal operational evidence. No cross-tenant record leakage.

## Tokens (proposed)
Background ink #17191B, warm paper #F0EEE7, accent ember #FF623D, glass teal #7ABFC1, secondary slate #717C86.
Body text on light: #17191B; body text on dark: #F0EEE7. Verify WCAG contrast in implementation; never use orange/teal as small text without contrast test.
Typography: robust grotesk/neo-grotesk system stack for UI; strong editorial display weight for headings. Avoid external font dependency by default.
Shape: compact radii (4–8px), visible borders, crisp grids; glass-like translucent layers only in noncritical decorative surfaces. Motion: subtle and reduced-motion aware.

## Public homepage hierarchy
Header: logo, How it works, Who it's for, Approach, Contact.
Hero: “Keep your software. Simplify the work.” Supporting: “We help businesses reduce the repetitive work between the tools they already use.” CTA: “Discuss your workflow.” Secondary: “See an example.”
Sections: common friction -> 3-step method -> two clearly hypothetical industry examples -> permissions/control reassurance -> FAQ -> inquiry with accurate privacy/captcha and email fallback.
No fictitious case studies, testimonials, savings claims, verified security certifications, or live connector claims.

## Customer workspace IA (design only)
Home: connection status, needs-attention approvals, recent activity, next step; zero state honest and useful.
Connections: per-tool and per-mailbox separate scopes, owner, consent, status, revocation; ambiguous sender requires selection.
Workflows: available vs planned vs disabled with accurate labels; no mock controls that imply action.
Approvals: proposed action, source, destination, recipient, effect, reviewer, expiry, approve/reject; actual execution server-side only.
Activity: readable event timeline, who/what/when and outcome; no fabricated metrics.
Settings: business membership, roles, permissions, notifications, billing only when implemented.

## Founder console IA (design only)
Overview: organization list and health without exposing private records across tenants.
Attention: pending owner approvals, blocked integrations, failures, customer support.
Customers: tenant-isolated views and authorized membership actions.
Connections: provider health, least-privilege scope, audit status.
Operations: workflow executions, errors, cost/usage if verified.
Release/health: operational evidence and internal diagnostics; never public.
No security status badges without actual backed evidence.

## Responsive/accessibility acceptance
320, 375, 768, 1440 widths; keyboard navigation, visible focus, accessible forms and status announcements; 200% zoom; reduced motion; WCAG AA contrast and touch targets. No decorative glass blur behind critical text.
Run real browser tests and inspect screenshots before merge.

## Existing work / sequencing
Site PR #5 contact safety is a release gate; PR #12 customer-first copy is stacked on #5. Avoid conflicting edits.
Site PR #8 customer home, #10 HCP journey, #16 onboarding, #14 synthetic sales demo remain separate, unmerged, not proof of live product.
Core #84, Company #33, Infrastructure #15 remain open; do not claim HCP live.
Use this document as an editorial/design reference; implement only in isolated reviewed PRs.
Independent Prism/publication and Vesper/security review, then founder exact-SHA approval before merge or deploy.

## Roles
Indigo: UX, visuals, responsive prototypes. Mara: audience/offer. Rook: implementation and integration. Keel: hosting/release. Prism: claims. Vesper: independent security disposition.
