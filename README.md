# BAGDigital Website

Public website source for [bagdigital.tech](https://bagdigital.tech/). Hosted with GitHub Pages.

## About this repository

This repository contains the static HTML, CSS, JavaScript, domain configuration, and search-engine files used by the BAGDigital public website.

## Website guidelines

Public-facing content should:

- explain BAGDigital in plain language;
- focus on customer problems and outcomes;
- clearly distinguish examples from currently available integrations;
- avoid private customer information, credentials, internal planning details, or unsupported product claims;
- keep the site accessible, mobile-friendly, fast, and easy to understand.

## Domain

The GitHub Pages `CNAME` contains the canonical domain:

```text
bagdigital.tech
```

## Development

Before merging website changes:

- verify navigation and contact flow;
- verify mobile layout;
- verify titles, descriptions, canonical URL, and sitemap;
- avoid committing secrets or private customer data;
- keep customer-facing claims accurate and understandable.


## Field Notes publication candidate (source-only; release requires approval)

Site #18's selected **Field Notes / Metro-inspired tiles** direction is implemented in the root
`index.html` and `styles.css` on its isolated draft PR branch. The original design reference
remains untouched in Site PR #20. This changes neither the live GitHub Pages branch nor
production DNS until the separately approved merge/publication.

**Founder-requested in-page inquiry form — SOURCE-ONLY, NOT LIVE OR DELIVERY-VERIFIED:**
The proposed homepage now has a native HTML form for name, email, optional business
name, project category and short project description. Visitors can submit from the page
without launching a mail app. A required checkbox discloses that submitted details go
to **FormSubmit.co**, BAGDigital's existing site intake provider. Native POST may navigate
to FormSubmit's CAPTCHA challenge and thank-you/verification page. No custom JavaScript,
AJAX, tracking, attachments, payment or BAGDigital customer authentication is added.
The visible `jaime@bagdigital.tech` email address remains a manual fallback.

This is **not** an approved live form: provider recipient activation, owner-approved
synthetic end-to-end submission, server-side `_honey`/CAPTCHA enforcement, filtered
negative-path behavior, delivery and privacy disclosures require evidence plus
independent Vesper review under **Site #7 / PR #5 (RT-WEB-01)**. Provider-side
validation cannot be claimed from HTML or CI tests. No real visitor data should be
entered until approval. Do not send test forms without founder authorization.

Browser source policy now permits `form-action https://formsubmit.co` to support the
native provider POST and otherwise retains script/connect denials. The old tracked
`app.js` remains **unreferenced**; do not re-enable the historical AJAX handler.

**Verify locally:**

```bash
node --test tests/production-homepage.test.mjs
python3 -m http.server 8765
```

Then visit `http://localhost:8765/` in a browser to inspect the on-page form, native
required/email validation, keyboard focus, privacy/consent notice and responsive layout.
Do not click Submit with real data or send a test inquiry without specific approval. The PR workflow runs static
contracts and captures Chromium screenshots at widths 320, 375, 768 and 1440. Screenshot
generation is *not* a substitute for manual keyboard, 200% zoom, screen-reader or
live-host verification.

**HTTP security boundary:** the page declares a restrictive **meta CSP** that Chromium
can apply to this document; GitHub Pages response headers are not controlled by
root HTML. In particular, `frame-ancestors` / framing policy, HSTS,
`X-Content-Type-Options`, and other response-level controls cannot be proven
from the meta element or CI screenshots. Verify the actual HTTPS response and
hosting behavior separately after release, and report any unsupported header
control as residual risk rather than claiming that a meta directive enforces it.
The historical `app.js` remains tracked but is not referenced by this page.

**Accessibility boundary:** four Chromium viewport screenshots and offline DOM
checks do not prove actual 200% browser zoom, keyboard order, screen-reader
behavior, or hidden overflow. Indigo must independently test those before
publication and return an exact-SHA verdict. Earlier mailto-only acceptance evidence
cannot establish the new third-party contact form's privacy or delivery.

**Publication gates:** the founder additionally reviews any new form destination and consent/privacy behavior; Site #7 independent provider anti-abuse/delivery evidence and a fresh Vesper exact-SHA verdict are required. Indigo visual/mobile and accessibility acceptance; Mara service and
consultation claims check; Prism independent exact-artifact publication review; Vesper
technical review if a later revision introduces sensitive form/auth/provider/deployment
functionality; founder exact-PR source merge and separate publication approval; then
verify real `https://bagdigital.tech/` and the contact experience. Customer logins and
connected provider claims require independent Core release evidence. No design mockup
or green CI is proof of customer availability.
