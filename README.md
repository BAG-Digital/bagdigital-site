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

**Contact is mailto-only:** the visitor's own email application opens when they choose
"Email us about your project"; the visitor must review and send it. This page contains no
FormSubmit form, analytics, JavaScript, customer login, credentials, provider calls, or account
creation. The separate Site #7 / PR #5 FormSubmit source and live anti-abuse/delivery gate
are **not** declared resolved by this homepage.

**Verify locally:**

```bash
node --test tests/production-homepage.test.mjs
python3 -m http.server 8765
```

Then visit `http://localhost:8765/` in a browser and inspect the page and mailto link.
Do not send a test email unless specifically authorized. The PR workflow runs static
contracts and captures Chromium screenshots at widths 320, 375, 768 and 1440. Screenshot
generation is *not* a substitute for manual keyboard, 200% zoom, screen-reader or
live-host verification.

**Publication gates:** Indigo visual/mobile and accessibility acceptance; Mara service and
consultation claims check; Prism independent exact-artifact publication review; Vesper
technical review if a later revision introduces sensitive form/auth/provider/deployment
functionality; founder exact-PR source merge and separate publication approval; then
verify real `https://bagdigital.tech/` and the contact experience. Customer logins and
connected provider claims require independent Core release evidence. No design mockup
or green CI is proof of customer availability.
