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
- keep the site accessible, mobile-friendly, fast, and easy to understand;
- disclose third-party handling of inquiry data;
- warn visitors not to submit credentials, customer records, or other sensitive data through public intake;
- distinguish named software examples from integrations that are actually available.

## Domain

The GitHub Pages `CNAME` contains the canonical domain:

```text
bagdigital.tech
```

## Development

Before merging website changes:

- verify navigation and contact flow;
- verify mobile layout;
- verify titles, descriptions, canonical URL, privacy notice, and sitemap;
- verify inquiry fields remain minimized and bounded;
- avoid committing secrets or private customer data;
- keep customer-facing claims accurate and understandable.

## Public inquiry security contract

Until BAGDigital has its own independently reviewed intake backend, the public form relies on **FormSubmit** for delivery and abuse screening:

- Use the normal `https://formsubmit.co/...` POST endpoint. Do not silently switch to AJAX or intercept the native submit event: doing so can bypass or break provider-hosted CAPTCHA challenges.
- Keep FormSubmit's reserved `_honey` field name. A lookalike custom input only checked in JavaScript does **not** protect against direct provider POST requests.
- Do not insert `_captcha=false`. FormSubmit documents reCAPTCHA as enabled by default.
- Leave HTML required-field validation active even when JavaScript is unavailable, retain the direct-email fallback, and explain any CAPTCHA redirect in the form/privacy notice.
- Do not submit real credentials, customer records, personal financial information, or confidential business data while testing.

Run static source-contract tests from the repository root:

```sh
node --test tests/contact-form-contract.test.mjs
```

**Limit:** these local tests cannot establish how FormSubmit behaves in production. Before closing RT-WEB-01 or merging the website PR, the independent Red Team must review the exact SHA and the owner must approve any safe live test. Verify a genuine browser submission and provider-side bot filtering using only non-sensitive synthetic data; do not blindly send a flood of test submissions or assume CAPTCHA enforcement from code alone.
