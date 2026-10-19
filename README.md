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


## Formspree xjygzpzk integration — 2026-10-18

**Current migration PR source, pending release review.** BAGDigital uses static GitHub Pages and plain native HTML POST (no JavaScript/AJAX/React SDK). The public consultation form in `index.html` is configured to post to the founder-supplied **public** Formspree endpoint `https://formspree.io/f/xjygzpzk`. The Formspree form ID is intentionally public, **not** an API secret.

- Fields: `name` (required, max 100), `email` (required email, max 254), optional `business` (max 150), `interest` (required select), `message` (required, max 3000), unchecked `processing_ack` (required in the browser), hidden `subject` and hidden `_gotcha` honeypot.
- Formspree special names are **`subject`** and **`_gotcha`**; legacy FormSubmit-specific `_subject`, `_template`, `_honey` and `_captcha=false` must never be sent.
- CSP `form-action https://formspree.io` only; site scripts remain disabled; CSS and public navigation unchanged. Native successful submissions normally navigate to Formspree's managed confirmation screen, not an invented local success state.
- The compact pre-consent note and the detailed first-party `privacy.html` disclose the **new provider** and its published Free-plan 30-day submission *history*, not a guarantee of complete deletion. Privacy policy: https://formspree.io/legal/privacy-policy .
- The old FormSubmit endpoint must be explicitly disabled/retired in the prior provider account after the new form has been accepted; removing it from HTML does not revoke the old address.

**Dashboard security configuration is not verifiable from static source.** Before publication the founder/Keel must verify the actual form **xjygzpzk** has:

1. Form-level **Spam protection / reCAPTCHA ENABLED**, server side, and optional built-in `_gotcha` trap. Confirm a normal accessible challenge/return in browser.
2. Project **Restrict to Domain = `bagdigital.tech`** (without https or www), understanding this relies on Referer and some privacy browsers may cause false-positive spam. Site's `strict-origin-when-cross-origin` referrer policy supports it. This is an additional spam filter, **not authentication**.
3. **Workflow** server-side validation requires matching field names: `name` Text required; `email` Email required; `interest` Text required; `message` Text required; `processing_ack` Text required (checkbox posts `yes`). **Server-side validation requires matching Workflow settings.** A required-present validation does not cryptographically prove an actual human clicked consent and cannot force the exact `yes` value on every arbitrary direct POST. Do not claim a legally enforced consent check without the corresponding provider feature and negative test.
4. Correct *target notification email* and Enabled workflow email action, with verified inbox delivery. Account/plan quota confirmed: Free is **50 processed submissions/month**, 30 days submission history; over-limit notification emails may be held. Avoid test traffic until owner-approved low-volume safe cases.
5. Independent Vesper exact-source/actual account-configuration review, Prism copy/privacy review and founder site publication approval, plus post-deploy first-party HTTPS/canonical/privacy, CAPTCHA, and correct recipient confirmation.

This PR's CI is intentionally **non-submitting** and confirms only the browser form, syntax, valid/invalid field behavior, accessibility labels, CSP and local privacy navigation. It cannot inspect a private Formspree dashboard, verify live recipient, vendor CAPTCHA settings, negative server acceptance, retirement of FormSubmit, or legal compliance. No new Cloudflare/AWS project or credentials required for this managed form.

## Archived previous Field Notes/FormSubmit review history (not current integration)

**The following older publication-candidate notes describe historical prepublication FormSubmit behavior and are retained for audit reference. They are not current BAGDigital website instructions.** The above Formspree integration is authoritative for this PR's present source/configuration.

### Field Notes publication candidate (source-only; release requires approval)

Site #18's selected **Field Notes / Metro-inspired tiles** direction is implemented in the root
`index.html` and `styles.css` on its isolated draft PR branch. The original design reference
remains untouched in Site PR #20. This changes neither the live GitHub Pages branch nor
production DNS until the separately approved merge/publication.

**Founder-requested in-page inquiry form — SOURCE-ONLY, NOT LIVE / PUBLIC-ORIGIN DELIVERY UNVERIFIED:**
The proposed homepage now has a native HTML form for name, email, optional business
name, project category and short project description. Visitors can submit from the page
without launching a mail app. A required checkbox discloses that submitted details go
to **FormSubmit.co**, BAGDigital's existing site intake provider. Native POST may navigate
to FormSubmit's CAPTCHA challenge and thank-you/verification page. No custom JavaScript,
AJAX, tracking, attachments, payment or BAGDigital customer authentication is added.
The visible `jaime@bagdigital.tech` email address remains a manual fallback.

This is **not** an approved public form. On 2026-10-15, the founder made
**two distinct synthetic submissions from localhost**, and two corresponding
FormSubmit inquiry emails were confirmed in the BAGDigital inbox. They were
intentional separate submissions, not evidence of duplicate-provider behavior.
This proves positive delivery for those local test submissions **only**, not
from the eventual public `bagdigital.tech` site.

FormSubmit's server-side `_honey` suppression, CAPTCHA challenge, provider
rate limiting, direct-POST behavior and negative-path/non-delivery outcomes
have **not** been independently verified. Browser `required`, `maxlength`,
`type=email` and `processing_ack` can be bypassed by clients posting
directly. These controls are browser usability aids, **not** proof that the
provider enforces consent, content limits or anti-abuse rules.

**First-party Inquiry Privacy Notice:** `privacy.html` is linked directly from
the form's pre-acknowledgment processor disclosure and the global footer, and
uses the same Field Notes styling and strict scriptless meta CSP. The form-side
privacy link opens in a labeled new tab to keep the unsent inquiry visible in
the original tab. Footer/privacy-page links are ordinary same-tab navigation.
The local browser fixture exercises `/privacy.html` → `/index.html#contact`.
A same-tab return was observed to leave the name field empty and no field
focused; **do not claim automatic draft recovery**. The visitor can return
to the original form tab when opening the privacy notice from the form. It explains
the precise requested fields, FormSubmit delivery/30-day documented archive,
BAGDigital inquiry-only use and possible business-email retention, limits of
deletion promises, and contact options. The shorter three-paragraph form notice
remains before the unchecked required acknowledgment. This is source-only and
has not received independent final Prism/Vesper publication acceptance.
Set any “last updated” publication date to the ACTUAL approved release date;
do not silently backdate this unreleased candidate.

**Privacy disclosure under founder/Mara/Prism acceptance review:** submitted
name, email, service, message and optional business are transferred to
FormSubmit.co, which emails them to BAGDigital. FormSubmit documents a
**30-day archive for form submissions**, separate from the copies retained
in BAGDigital's email account:
https://formsubmit.co/documentation
Its published privacy terms are https://formsubmit.co/privacy.pdf .
The new pre-consent page text links those terms, explains FormSubmit's 30-day
archive and BAGDigital's use of the inquiry for review/reply; it does **not**
promise a BAGDigital inbox deletion deadline. The founder/Mara still must
accept the actual post-receipt business email handling, and independent Prism
must review the exact public disclosure.

**Release HOLD:** Site #7 / PR #5 (RT-WEB-01) remains OPEN.
The founder subsequently approved the documented bounded **maximum-three-test**
FormSubmit plan in the 2026-10-15 Control Desk chat, recorded at
https://github.com/BAG-Digital/bagdigital-site/issues/7#issuecomment-6202766146 .
The older one-positive-test approval is not blanket authorization.
**No additional external provider requests have been performed in this
remediation run.** This source review/CI does not prove any negative-path
provider enforcement. No real visitor data should be entered before
independent review and founder publication authorization.

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

**Accessibility boundary:** four Chromium screenshot widths and source tests
are not human assistive-technology acceptance or verification of hosted CAPTCHA
accessibility. Earlier mailto-only Chromium zoom and keyboard checks do not
certify the new third-party form. Indigo must test form field labels/errors,
consent, tab/focus, native browser 200% zoom, spoken VoiceOver/NVDA when a
human tester is available, CAPTCHA/confirmation and failure/return flow.
Unavailable checks must be reported NOT TESTED and kept as release gates.

**Publication gates:** the founder additionally reviews any new form destination and consent/privacy behavior; Site #7 independent provider anti-abuse/delivery evidence and a fresh Vesper exact-SHA verdict are required. Indigo visual/mobile and accessibility acceptance; Mara service and
consultation claims check; Prism independent exact-artifact publication review; Vesper
technical review if a later revision introduces sensitive form/auth/provider/deployment
functionality; founder exact-PR source merge and separate publication approval; then
verify real `https://bagdigital.tech/` and the contact experience. Customer logins and
connected provider claims require independent Core release evidence. No design mockup
or green CI is proof of customer availability.

## Limited provider test plan — FOUNDER APPROVED IN SCOPE; NOT EXECUTED HERE

The founder explicitly approved a maximum of **three benign manual
FormSubmit interactions** as described below, and accepted the disclosed
FormSubmit / BAGDigital business-email handling, under the precise conditions
recorded in Site #7 decision https://github.com/BAG-Digital/bagdigital-site/issues/7#issuecomment-6202766146 .
This approval is **NOT a result of testing** and does not authorize publication,
broad provider testing, secrets, actual customer records or changing systems.
The execution environment in this session blocks external browser/provider
submissions, so all three live-provider scenarios remain **NOT EXECUTED here**.
Each proposed interaction must use fabricated identifiers and a distinct,
non-sensitive test marker, and must be performed only manually by the founder
or authorized human tester:

1. Observe the normal hosted CAPTCHA/confirmation/return behavior with
   one benign synthetic form, stopping on errors and never bypassing CAPTCHA.
2. Send one synthetic request with the reserved `_honey` field filled,
   then independently check that no inquiry was delivered. This can
   contribute negative-path evidence but not prove abuse resistance.
3. Submit one synthetic direct-POST request without the browser consent
   checkbox only if specifically founder-approved, to document whether
   FormSubmit rejects it (rather than assuming a browser checkbox is
   enforced server-side). Never attempt to evade CAPTCHA or other controls.

No retries, load testing, rate-limit probes, secrets, real customers, or
sensitive data. Stop immediately on unexpected provider behavior,
activation requests, challenge failure, provider complaints or ambiguous
results. Record sanitized request type, marker, time, page outcome and
receipt/non-receipt only. Independent Vesper must judge whether evidence
satisfies Site #7; positive localhost deliveries alone do not.

**Execution note:** These are conditional, manually operated external
provider tests, **not performed by GitHub Actions**. GitHub CI instead runs
`tests/production-browser-smoke.mjs` with Chromium over loopback HTTP,
checks real native browser form validity, notice ordering, zero page-wide
overflow across four viewports, and asserts no external network request.
It NEVER clicks Submit, sends inquiries, tests live CAPTCHA or impersonates
a human screen-reader session. CI evidence cannot close RT-WEB-01.

## Human acceptance checklist — not yet executed for this form

- Native browser 200% zoom, 320px reflow, complete Tab/Shift+Tab keyboard
  access, required-field validation, invalid-email messages, consent focus.
- Spoken VoiceOver/NVDA field labels, description, checkbox and invalid
  status with OS/browser/reader versions; automatic AX tree is insufficient.
- CAPTCHA keyboard/screen-reader handling, success/failed delivery page,
  back navigation and copyable `jaime@bagdigital.tech` fallback.
- Actual post-publication `https://bagdigital.tech/` HTTPS response
  headers, canonical, redirects and provider return flow by Keel.
- Record each item PASS, FAIL or NOT TESTED; never infer success from
  screenshot CI, CSS or two localhost inbox receipts.
