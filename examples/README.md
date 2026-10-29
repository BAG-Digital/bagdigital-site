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

## Copy research (2026-10-28) — inspiration, not reproduced text

Research focused on established businesses and high-performing commercial websites. This does **not** mean their revenue, design, or conversion performance transfers to BAGDigital's fictional examples. None of their headlines, endorsements, logos, ratings, customer history, project imagery or awards may be inserted into these examples.

| Reference | Evidence | Useful writing pattern applied |
| --- | --- | --- |
| Power Washing Man, Beaufort — https://powerwashingman.com/ | Local service coverage, clear exterior-cleaning categories, publicly displayed reviews and highly visible quote path | Start with homeowner concerns; name concrete cleaning surfaces; make the next step obvious; do not invent ratings or claim real reviews |
| Immaculate Exteriors, Beaufort — https://immaculateexteriors.com/ | Service page distinguishes soft washing, pressure washing, concrete and window cleaning; operating since 2016 stated publicly | Explain why approach differs by surface; limit technical detail to what helps homeowners decide |
| The Greenery, Hilton Head — https://thegreeneryinc.com/about and https://thegreeneryinc.com/the-greenery-celebrates-50-years | Company reports operating since 1973 and publishes distinct maintenance, installation, hardscape and irrigation offerings | Organize offerings around practical site requirements and customer outcomes; never borrow longevity or awards |
| LowCountry Scapes — https://lowcountryscapes.com/ | Clear hardscape/landscape categories and action-oriented consultation routing | Make the site feel local and useful, and explain the function of paths, patios and planting instead of generic garden adjectives |
| Yardzen — https://project.yardzen.com/ and https://www.belgard.com/yardzen/ | Transparent package distinctions and a visible customer journey | Define outcomes and steps a customer can understand; don't promise tools or project management absent from BAGDigital's approved offers |

**Editorial rules:** Write fresh original copy. Lead with an identifiable customer problem, specify a service, say what decisions matter, and give one truthful next step. Keep regional context proportionate. Keep Saltline and Marsh & Oak visibly fictional, with illustrative rather than completed project imagery. Don't invent client statistics, testimonials, licensure, veteran status, guarantee, service availability or a working inquiry endpoint. The website-pricing tiers are starting prices and must be evaluated on an agreed scope, not used as an unconditional photography/content package promise.
