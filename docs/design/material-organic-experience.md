# BAGDigital — Material-inspired organic design system (proposal)

**Status:** Design proposal only. Not adopted brand governance, production implementation, or an authorization to merge/deploy.
**Owner roles:** Indigo (experience), Mara (services/market positioning), Rook (technical contracts), Prism (publication), Vesper (independent security gate).

## Product family, one design language

1. **Public marketing site**: customer discovery, accurately scoped services, accessible consultation request.
2. **Customer workspace**: signed-in tenant-scoped overview, connections, approvals, activity; only after Core's server-side identity/read contracts and review.
3. **Founder console**: owner-only operational overview; organization summaries and account health fetched through authorized server boundaries. Never let shared client-side CSS or components imply shared access.
4. **Core**: owns authorization, tenants, credentials, connection evidence, provider integrations, audit, and safe actions. The browser is a presentation surface, never the authority.

This document does not supersede Core ADRs or company governance. Core remains the highest product priority.

## Experience values

**Approachable · Organic · Useful · Fast · Trustworthy.** Take inspiration from Material Design's hierarchy, shape, accessible interactions, and restrained expressive motion; do not copy Google's logos, proprietary assets, or imply affiliation. No literal skateboards, glassware, cannabis imagery, or generated Lowcountry photography. Personal style is expressed through playful asymmetry, shape, typography, and confident composition.

## Visual primitives (proposed)

| Token | Proposed value | Intent |
| --- | --- | --- |
| canvas | `#F7F8F4` | light warm neutral |
| surface | `#FFFFFF` | legible primary card |
| ink | `#20302D` | primary body text |
| muted | `#53655F` | secondary body text |
| primary | `#19665E` | actions, focus and links on light |
| primary-light | `#D9EEE8` | gentle surface tint |
| lime | `#D9F294` | warm optimistic accent, dark ink on top |
| mist | `#E6F2F1` | organic illustration ground |
| outline | `#DCE6E0` | subdued separation |
| coral | `#E9AB91` | restrained tertiary accent |

**Type:** System UI stack initially; body 16px+ and generous line-height; slightly tighter display titles, otherwise readable. Do not load remote fonts until a documented licensing/performance decision.

**Shape:** 16–28px for interactive cards, 999px for pills, irregular overlapping *decorative* fields only. Surfaces remain predictable grids; no decorative obstacles in forms.

**Elevation:** soft broad shadows over harsh borders; selected interactive surfaces visibly respond to hover/focus. Focus ring must not rely on color alone.

**Motion:** 180–320ms UI transitions, slow atmospheric background movement 15–28s. Animate transform/opacity, never actual layout positions during a form interaction. Honor `prefers-reduced-motion: reduce`; keep critical information static. Avoid motion after explicit user interaction unless helpful.

## Marketing information architecture

Hero: **Less busywork. More room to grow.** Explain web development, workflow improvement, safe integration exploration, and support. CTA **Request a free consultation** → easy form. Secondary CTA **Explore services**.

Sections: four clear services with credible outcomes → honest *illustrative* process → plain-language FAQ → consultation form → email fallback. No made-up metrics, portfolios, customer quotes, awards, or provider connection badges.

**Consultation preview boundary:** form can help visitors compose an email; it does not submit to a backend, claim successful delivery, store data, or collect secrets. Before publishing a production form: choose approved provider, privacy disclosure, abuse controls, consent and data retention, verify end-to-end deliverability and Prism review. Never embed credentials in frontend code.

## Customer workspace / founder console alignment

Same colors, typography, surfaces and motion tokens as public website; distinctly labeled, authenticated routes in a future app, **not** on GitHub Pages.

- Customer navigation: Overview → Connections → Approvals → Activity → Settings (when implemented).
- Founder navigation: Overview → Customers → Attention → Connections → Health (when implemented).
- Truthful states: *Not connected*, *Pending approval*, *Needs attention*, *Connected* only with actual Core verified evidence.
- Pending actions are not executed by a UI click alone; Core capability, policy, identity and audit authorize actions.
- Per-business multiple Google Workspaces/mailboxes require separate scopes, consent, sender identity, health and revocation.
- Cross-customer/organization views are server-filtered by actual authenticated authorization, never a browser-only dropdown.

## Acceptance and gates

- Test layout at 320 / 375 / 768 / 1440 widths, 200% zoom, keyboard-only and screen reader navigation.
- WCAG AA text contrast, 44px targets where practical, explicit labels, accessible validation/status.
- No remote assets or images required. Performance targets should be measured before release.
- No production or real-provider integration from a static concept.
- **Prism:** review copy/claims and inquiry privacy before publication.
- **Vesper:** review authenticated portal / provider-backed Core adapter, live tenant information, credentials, executable approvals, or security-sensitive deployment at exact SHA; separate HCP RT-M3-11 + cutover gates still apply.
- **Founder:** approve reviewed PR and any consequential release separately.

## Sources of truth

- `bagdigital-company/company/STRATEGY.md`, `portfolio/PORTFOLIO.md`, and `decisions/DECISION-LOG.md`.
- `bagdigital-core/AGENTS.md`, `SECURITY.md`, `docs/ROADMAP.md` and release evidence.
- Core #84, Company #33, Infrastructure #15 remain gated at this writing.

**Do not change the existing published site as part of this design proposal.**
