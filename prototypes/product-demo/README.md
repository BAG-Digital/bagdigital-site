# BAGDigital — Interactive workflow walkthrough

**Status:** NON-PUBLIC / ENTIRELY SYNTHETIC / FUNCTIONAL SIMULATION ONLY  
**Tracked in:** [Site #13](https://github.com/BAG-Digital/bagdigital-site/issues/13)  
**Separate from:** Public homepage [Site #11 / PR #12](https://github.com/BAG-Digital/bagdigital-site/pull/12); contact-form security [Site #7 / PR #5](https://github.com/BAG-Digital/bagdigital-site/pull/5); customer portal [Site #6](https://github.com/BAG-Digital/bagdigital-site/issues/6).

## What this does

A functional, locally runnable sales demonstration of **customer inquiries → organized details → example reply draft → human-approved demo outcome**.

- **Service business:** hypothetical website inquiry about a skylight leak, organized into appointment follow-up, then an example response.
- **Marketing agency:** hypothetical social media inquiry from a new café, with sample questions for budget, opening date, inspiration, and promotion.
- The visitor can select the example, advance each step, approve the draft **inside the demo only**, and reset it. Switching examples clears all prior status.
- **The demo never sends messages, edits a record, stores input, reads an account, connects social inboxes or Housecall Pro, calls an API or generates AI text.** Replies are prewritten and fixed in `demo.js`. All names and businesses are explicitly fictional.
- The explanatory copy covers useful buyer information without exposing BAGDigital's engineering internals.

## Open locally

After checking out the feature branch, open `prototypes/product-demo/index.html` in a browser. No app server, npm install, API key, provider account, or network access is needed for the demo itself.

For source tests, from the repository root:

```sh
node --test tests/product-demo-contract.test.mjs
```

To run actual browser acceptance checks (requires Node 24+ and Chrome/Chromium on the runner):

```sh
node tests/product-demo-browser.mjs
```

The browser test starts a **127.0.0.1-only** fixture, checks 320/375/768/1440px layout, real click transitions, approval and reset behavior, accessible names, and whether external resources were loaded. CI attaches 375px/1440px full-page screenshots of fictional data for designer/owner inspection, with seven-day retention.

## Safety / hosting boundaries

- This directory is not linked from the public homepage, and this PR is **draft/unmerged**. It should remain unpublished pending exact-SHA independent review and founder approval.
- An unlinked URL or `noindex` is **not** access control. If this `prototypes/` directory is merged into a GitHub Pages source branch, **assume it may become publicly accessible even without a homepage link**.
- Do not add real customer details, credentials, Google/Housecall Pro/social APIs, telemetry, account login, signup, data capture, or authenticated business information.
- To share later as a public demo, explicitly authorize publication after brand/claim/security review, then publish to a designated safe demo location rather than silently merging a private internal prototype.
- A live production product would need separately reviewed identity, tenant isolation, provider capabilities, consent/approvals, audit evidence, security gates, and actual connection-state data from Core. **None of that is implemented here.**

## Definition of done (design/demo branch)

- [x] Two real clickable example workflows with visibly distinct source, details and final response.
- [x] Four sequential states, no approval before draft, synthetic-only outcome, one-click reset and scenario switch reset.
- [x] Clearly labeled example data and "nothing connected/sent" disclaimers throughout.
- [x] Accessible semantic headings, skip link, named scenario group, pressed states, focus and status updates; responsive/reduced-motion CSS.
- [ ] Exact-head CI and browser interaction tests confirmed.
- [ ] Founder-designated independent reviewer examines complete diff and screenshots, checks product clarity, accessibility, trust and security.
- [ ] Founder authorizes any merge or external publication.

## Owner / role boundary

Indigo owns the demonstration and source-level/browser tests. Rook/Core owns any real capability or API behavior; the portal team owns production signup/dashboard/auth. Vesper must independently review security where applicable, and Prism may review visual/editorial consistency. Posting a GitHub review request does not automatically run another agent. **Do not merge before Jaime approves.**
