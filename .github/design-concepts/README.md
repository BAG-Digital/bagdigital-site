# BAGDigital customer workspace — static design concept

**Status: Prototype only. Not a deployed customer portal.**

Issue: [Site #6](https://github.com/BAG-Digital/bagdigital-site/issues/6)  
Core security contract: [Core #97](https://github.com/BAG-Digital/bagdigital-core/issues/97)  
Commercial exception: [Company #26](https://github.com/BAG-Digital/bagdigital-company/issues/26)

## What this demonstrates

- Mobile-first BAGDigital customer navigation and visual hierarchy.
- Safe, understandable first-run workflow with **zero connected providers**.
- Server-owned subscription/entitlement concept; the demo's $0 plan is explicitly
  **not** a publicly available subscription or live entitlement.
- A truthful automation catalog showing only **Coming soon**, not fake live actions.
- No jobs, invoices, customer data, real activity, or unverified integrations.

This intentionally reuses the public site's dark/acid-green visual language.
The example organization is synthetic. It **must not** be renamed to a real
customer or linked publicly as an actual login/dashboard.

## Review this prototype

Open `.github/design-concepts/customer-home.html` directly in a browser from a checked-out PR branch
or inspect the PR's source. It has a local stylesheet, no JavaScript, no forms,
no credentials, no state, no network calls and no external assets.

Run the source-contract regression tests from the repo root:

```sh
node --test tests/customer-home-contract.test.mjs
```

Tests check explicit demo labeling, no credential-capture mechanics, no misleading
connected-state claims, internal navigation and mobile/focus design hooks.
**Tests cannot prove browser accessibility, production auth, server authorization,
or provider integration.** Perform keyboard and narrow-width visual review before
approving the design as an implementation reference.

## What must exist before this becomes a real customer portal

- Accepted M9 identity architecture decision, verified login, sessions,
  membership and organization/workspace authorization.
- Tenant-enforced server read model and restricted PostgreSQL RLS context.
- Founder-authorized, organization-scoped Francisco-only complimentary
  entitlement that cannot be claimed through browser input or matching names.
- Honest connection and automation state backed by Core evidence.
- Verified red-team security review, production deployment tests and owner release
  approval. Public GitHub Pages must not implement production authentication.
- RT-M3-11 and separate credential cutover review before real HCP key migration;
  this is not required to demonstrate the **zero-connection** portal experience.

Possible application hostname: `app.bagdigital.tech` (**not configured here**).
The production app must live on a reviewed application/server boundary rather
than pretending the static website can manage auth and tenant data.

## Non-goals

No simulated buttons that can be confused with working actions; no subscription
activation, signup, login, HCP, Google, ChatGPT or automation runtime behavior;
no paid checkout, analytics, invitations, provider test records or API keys.

Do not link this page from the public website before there is an approved
customer-experience communication plan, and do not treat a static prototype
merge as the completion of Core M9 or Site #6.

## Accidental-publication guard

This concept is stored under `.github/design-concepts/` rather than a
normal `prototypes/` folder. BAGDigital's current branch-published GitHub
Pages site uses default Jekyll processing; by default Jekyll excludes paths
beginning with a dot, so the concept should **not be published** as a public
page after merge. A robots `noindex` directive or missing public navigation
is not an access control.

**Before any merge or Pages publishing mode change:** verify GitHub Pages
source settings and check that the concept URL returns 404. A future
`.nojekyll` file or custom Actions deployment that copies the whole source
could invalidate this assumption. No customer/provider secrets belong in
this folder even when not published.
