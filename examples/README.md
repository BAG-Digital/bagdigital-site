# BAGDigital — fictional website package examples

Two responsive, original, static website demonstrations for **published** BAGDigital website offerings. These are not portfolio claims, active customers, or production-connected software.

## Published scopes (unchanged)

- **One-Page Business Website — starting $1,295 one time:** a responsive informational page, basic SEO, one agreed revision round.
- **Business Website — starting $2,795 one time:** up to five responsive informational pages, basic SEO, two agreed revision rounds.

Hosting, domains, professional photo shoots, advanced content writing, additional scope, paid tools, booking, and integrated systems are separate unless explicitly quoted. Final price is based on written scope. Example imagery/design do not create an unconditional entitlement to bespoke illustrations or photography.

## Demonstration pages

- `/examples/index.html`: in-site comparison with branded miniature website mockups.
- `/examples/one-page/index.html`: Saltline Exterior Care, fictional Lowcountry exterior care company; services, process, story, contact details on one responsive page.
- `/examples/business/index.html`, `services.html`, `projects.html`, `about.html`, `contact.html`: Marsh & Oak Outdoor Living, five separate, working internal pages. Contact fields are disabled; no `form` is present and no information is collected.

## Original image assets

- `assets/saltline-home.webp`, `saltline-porch.webp`, `marsh-terrace.webp`, `marsh-path.webp`: original generated illustrative scenes, from the founder's fictional Lowcountry design study, cropped, optimized and self-hosted (no outside image provider request).
- `assets/lowcountry-cottage.svg`, `terrace-garden.svg`: original, self-hosted vector fallback art for reliable image-backed layouts. This artwork is **illustration**, not a photograph of a client property.
- The former Pexels image URLs were removed. Example pages set `img-src 'self'`, `script-src 'none'`, `connect-src 'none'` and `form-action 'none'`, as well as `noindex,nofollow`.
- Demo banners/captions call out fictional businesses and illustrative imagery. No testimonials, actual project claims, customer data, provider connections, scripts, signup or checkout.

## Review and release

The original BAGDigital homepage, production Formspree contact markup and six approved price/term cards remain unchanged, except two additive preview links on the website package cards. The site remains original Field Notes—not the previously rejected Working Edition redesign.

Source tests: `node --test tests/production-homepage.test.mjs tests/website-examples.test.mjs`. GitHub Actions runs mandatory no-submission Chromium smoke and screenshots at 320/375/768/1440, plus deep-scroll desktop/mobile captures. Automated tests do not establish actual manual screen-reader, text-zoom or all-device accessibility acceptance.

**Hold release** until founder design acceptance, Indigo manual usability/accessibility review, Mara scope economics, Prism claims/asset review and independent Vesper security/privacy assessment. Founder separately approves the exact final reviewed commit for merge and GitHub Pages publication; Keel then verifies public readback.
