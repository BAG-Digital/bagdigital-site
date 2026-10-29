# Website package examples — Site #11

This folder contains **fictional, static demonstrations**, not real BAGDigital client websites, released software, operational integrations, or customer portfolio claims.

The published prices have not changed:
- `/examples/one-page/`: **One-Page Business Website**, starting at **$1,295** one time. One informational page, basic search optimization, one agreed revision round.
- `/examples/business/`: **Business Website**, starting at **$2,795** one time. Up to five informational pages, basic search optimization, two agreed revision rounds.

## Demo structure
- `index.html`: comparison and scope summary in the current Field Notes visual system.
- `one-page/index.html`: Saltline Exterior Care, fictional exterior cleaning provider, single scrolling page.
- `business/{index,services,projects,about,contact}.html`: Marsh & Oak Outdoor Living, fictional five-page informational example.
- Demo-only contact fields are disabled and not inside a `form`; there is no submission/collection endpoint.
- Demos include `noindex,nofollow`, a CSP that blocks scripts/forms/connections and permits only first-party fallback art and `images.pexels.com` photos, and visible fictional/stock disclosure.

## Images and risk notes
- Examples use public Pexels stock photos **served from `images.pexels.com`**, not from BAGDigital clients. License: https://www.pexels.com/license/ (free commercial website use; no implied endorsements or client authorship).
- Both design systems now use original first-party SVG architectural illustrations as lightweight fallbacks underneath photos. These load when the photo service is slow, disconnected, or blocked. This is an illustration, **not** an actual client property.
- The site visibly discloses that the image provider may receive the browser's IP address. Verify actual photos and SVG fallback behavior in a real browser and review privacy notice obligations before any public release.
- In the earlier private ZIP, different locally generated original imagery was available. This GitHub candidate **does not include those files** because it is a separate, inspectable repository-source candidate. Do not claim the imagery matches the private ZIP; replace external images with reviewed first-party assets in a future exact-SHA revision if desired.

## Scope and safety
- These are **examples**, not fixed-price quotes or a promise of free photography, bespoke artwork, custom forms, booking, hosting, login, CRM, automations, AI agents or integrated systems.
- The original `/index.html` and live inquiry form remain untouched. Pricing cards only gain view-example links. All other cards, pricing, exclusions, consent and privacy notices are unchanged.
- After founder visual acceptance, Indigo reviews mobile/desktop/focus/zoom and copy, Prism checks public truthfulness, Vesper independently reviews security and third-party image disclosure. Requires explicit exact-SHA founder permission before merge and Keel verifies public GitHub Pages receipt.
- Run: `node --test tests/production-homepage.test.mjs tests/website-examples.test.mjs`; a GitHub Actions PR run also renders preview screenshots with Chromium without submitting any form.
